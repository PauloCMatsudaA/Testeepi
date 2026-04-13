"""
detection_service_real.py
─────────────────────────
Implementação real da detecção YOLOv8 com best.pt.

Como ativar:
  1. Coloque seu best.pt em: episee-backend/models/best.pt
  2. pip install ultralytics opencv-python-headless
  3. No arquivo app/api/detection.py, troque:
       from app.services.detection_service import analyze_frame_stub as analyze_frame
     por:
       from app.services.detection_service_real import analyze_frame, start_camera_streams

CLASSES PADRÃO (ajuste conforme seu treinamento):
  0 = capacete
  1 = colete_refletivo
  2 = luva
  3 = oculos_protecao
  4 = mascara
  5 = bota_seguranca
"""

import asyncio
import logging
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from ultralytics import YOLO

from app.core.database import AsyncSessionLocal
from app.models.occurrence import Occurrence, OccurrenceStatus
from app.models.camera import Camera
from sqlalchemy import select

logger = logging.getLogger(__name__)

# ── Configurações ─────────────────────────────────────────────────────────────
MODEL_PATH = Path(__file__).parent.parent.parent / "models" / "best.pt"

# EPIs obrigatórios — ocorrência é "nao_conforme" se algum estiver ausente
REQUIRED_EPIS = {"capacete", "colete_refletivo"}

# Confiança mínima para considerar uma detecção válida
CONFIDENCE_THRESHOLD = 0.50

# Analisar 1 frame a cada N (reduz processamento; 30 = ~1 FPS em câmera 30fps)
FRAME_INTERVAL = 30

# Singleton do modelo (carregado uma vez na primeira chamada)
_model: Optional[YOLO] = None


def get_model() -> YOLO:
    global _model
    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Modelo não encontrado em {MODEL_PATH}. "
                "Coloque seu best.pt na pasta episee-backend/models/"
            )
        logger.info(f"Carregando modelo YOLOv8: {MODEL_PATH}")
        _model = YOLO(str(MODEL_PATH))
        logger.info("Modelo carregado com sucesso.")
    return _model


# ── Análise de frame único ────────────────────────────────────────────────────

async def analyze_frame(camera_id: int, frame_data: bytes) -> dict:
    """
    Recebe bytes de uma imagem JPEG/PNG e retorna as detecções de EPI.

    Args:
        camera_id: ID da câmera
        frame_data: Imagem em bytes (JPEG ou PNG)

    Returns:
        {
          "camera_id": int,
          "status": "conforme" | "nao_conforme",
          "detections": [{"class": str, "confidence": float, "bbox": [x1,y1,x2,y2]}],
          "epi_detected": [str],
          "confidence": float  # maior confiança entre as detecções
        }
    """
    model = get_model()

    # Bytes → numpy array → OpenCV image
    nparr = np.frombuffer(frame_data, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if frame is None:
        raise ValueError("Não foi possível decodificar a imagem recebida.")

    # Inferência (roda em thread separada para não bloquear o event loop)
    results = await asyncio.get_event_loop().run_in_executor(
        None,
        lambda: model(frame, conf=CONFIDENCE_THRESHOLD, verbose=False)
    )

    detections = []
    for r in results:
        for box in r.boxes:
            detections.append({
                "class": model.names[int(box.cls)],
                "confidence": round(float(box.conf), 4),
                "bbox": [round(v, 1) for v in box.xyxy[0].tolist()],
            })

    epis_found = {d["class"] for d in detections}
    status = (
        OccurrenceStatus.conforme
        if REQUIRED_EPIS.issubset(epis_found)
        else OccurrenceStatus.nao_conforme
    )
    max_confidence = max((d["confidence"] for d in detections), default=0.0)

    return {
        "camera_id": camera_id,
        "status": status,
        "detections": detections,
        "epi_detected": list(epis_found),
        "confidence": max_confidence,
    }


# ── Leitura contínua de stream RTSP ──────────────────────────────────────────

async def process_camera_stream(camera_id: int, rtsp_url: str, sector_id: int):
    """
    Lê continuamente um stream RTSP e salva ocorrências no banco.
    Execute como task assíncrona (asyncio.create_task).

    Args:
        camera_id: ID da câmera no banco
        rtsp_url:  URL do stream (ex: rtsp://192.168.1.10/stream)
        sector_id: ID do setor relacionado à câmera
    """
    logger.info(f"[Câmera {camera_id}] Iniciando stream: {rtsp_url}")
    cap = cv2.VideoCapture(rtsp_url)

    if not cap.isOpened():
        logger.error(f"[Câmera {camera_id}] Não foi possível abrir o stream: {rtsp_url}")
        return

    frame_count = 0

    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                logger.warning(f"[Câmera {camera_id}] Stream encerrado ou perdido.")
                break

            frame_count += 1
            if frame_count % FRAME_INTERVAL != 0:
                await asyncio.sleep(0)
                continue

            # Encode frame para bytes
            _, buffer = cv2.imencode(".jpg", frame)
            frame_bytes = buffer.tobytes()

            try:
                result = await analyze_frame(camera_id, frame_bytes)

                # Salvar SEMPRE no banco (conforme ou não conforme)
                async with AsyncSessionLocal() as db:
                    occ = Occurrence(
                        camera_id=camera_id,
                        sector_id=sector_id,
                        status=result["status"],
                        epi_detected=result["epi_detected"],
                        confidence=result["confidence"],
                    )
                    db.add(occ)
                    await db.commit()

                if result["status"] == OccurrenceStatus.nao_conforme:
                    logger.warning(
                        f"[Câmera {camera_id}] NÃO CONFORME — "
                        f"EPIs detectados: {result['epi_detected']} | "
                        f"Faltando: {REQUIRED_EPIS - set(result['epi_detected'])}"
                    )

            except Exception as e:
                logger.error(f"[Câmera {camera_id}] Erro na análise do frame: {e}")

            await asyncio.sleep(0)  # ceder controle ao event loop

    finally:
        cap.release()
        logger.info(f"[Câmera {camera_id}] Stream encerrado.")


# ── Iniciar streams de todas as câmeras ativas ───────────────────────────────

async def start_camera_streams():
    """
    Busca todas as câmeras ativas no banco e inicia uma task por câmera.
    Chame no startup do FastAPI:

        @app.on_event("startup")
        async def startup():
            asyncio.create_task(start_camera_streams())
    """
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Camera).where(Camera.is_active == True)
        )
        cameras = result.scalars().all()

    if not cameras:
        logger.warning("Nenhuma câmera ativa encontrada no banco.")
        return

    tasks = []
    for cam in cameras:
        task = asyncio.create_task(
            process_camera_stream(cam.id, cam.stream_url, cam.sector_id)
        )
        tasks.append(task)
        logger.info(f"Task iniciada para câmera: {cam.name} ({cam.stream_url})")

    logger.info(f"{len(tasks)} stream(s) iniciado(s).")
    await asyncio.gather(*tasks, return_exceptions=True)
