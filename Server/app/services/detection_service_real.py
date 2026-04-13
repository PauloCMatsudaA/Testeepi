import subprocess
import shutil
import os
import asyncio
import logging
import cv2
import numpy as np
from datetime import datetime

logger = logging.getLogger(__name__)

# ── Configurações ──────────────────────────────────────────────────────────────

HLS_DIR = "hls_streams"
os.makedirs(HLS_DIR, exist_ok=True)

# Caminho do modelo treinado — coloque o best.pt dentro da pasta Server/
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "..", "best.pt")

# Ajuste as classes conforme o seu best.pt foi treinado
# Exemplo: se treinou com SH17 ou dataset similar
CLASSES_EPI = {
    "helmet", "hard hat", "capacete",
    "vest", "colete", "colete_refletivo",
    "glove", "luva",
    "glasses", "oculos", "oculos_protecao",
    "mask", "mascara",
    "boot", "bota", "bota_seguranca",
}

# EPIs obrigatórios para considerar "conforme" (ajuste conforme seu projeto)
EPIS_OBRIGATORIOS = {"helmet", "vest"}  # ou {"capacete", "colete_refletivo"}

CONFIANCA_MINIMA = 0.5  # só detecta acima de 50% de confiança

processos_ffmpeg: dict[int, subprocess.Popen] = {}
tarefas_deteccao: dict[int, asyncio.Task] = {}

_model = None  # singleton do modelo YOLO

FFMPEG_BIN = (
    shutil.which("ffmpeg")
    or r"C:\ProgramData\chocolatey\bin\ffmpeg.exe"
)


# ── Modelo YOLO ────────────────────────────────────────────────────────────────

def get_model():
    global _model
    if _model is None:
        try:
            from ultralytics import YOLO
            _model = YOLO(MODEL_PATH)
            logger.info(f"Modelo YOLOv8 carregado: {MODEL_PATH}")
        except Exception as e:
            logger.error(f"Erro ao carregar modelo: {e}")
            _model = None
    return _model


# ── HLS (FFmpeg) ───────────────────────────────────────────────────────────────

def iniciar_hls(camera_id: int, rtsp_url: str):
    pasta = os.path.join(HLS_DIR, str(camera_id))
    os.makedirs(pasta, exist_ok=True)
    m3u8 = os.path.join(pasta, "index.m3u8")

    if camera_id in processos_ffmpeg:
        proc = processos_ffmpeg[camera_id]
        if proc.poll() is None:  # ainda rodando
            return
        else:
            del processos_ffmpeg[camera_id]  # processo morto, reinicia

    cmd = [
        FFMPEG_BIN,
        "-rtsp_transport", "tcp",
        "-i", rtsp_url,
        "-c:v", "copy",
        "-an",
        "-hls_time", "2",
        "-hls_list_size", "5",
        "-hls_flags", "delete_segments",
        "-y", m3u8,
    ]
    try:
        proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        processos_ffmpeg[camera_id] = proc
        logger.info(f"HLS iniciado para câmera {camera_id}")
    except FileNotFoundError:
        logger.error(f"FFmpeg não encontrado em '{FFMPEG_BIN}'.")


def parar_hls(camera_id: int):
    proc = processos_ffmpeg.pop(camera_id, None)
    if proc:
        proc.terminate()
        logger.info(f"HLS encerrado para câmera {camera_id}")

    # Para a task de detecção também
    task = tarefas_deteccao.pop(camera_id, None)
    if task:
        task.cancel()


# ── Detecção com YOLOv8 ────────────────────────────────────────────────────────

async def analisar_frame(camera_id: int, frame: np.ndarray) -> dict:
    """Roda YOLOv8 no frame e retorna resultado."""
    model = get_model()
    if model is None:
        return {"status": "erro", "detections": [], "epi_detected": [], "confidence": 0.0}

    loop = asyncio.get_event_loop()

    # Roda inferência em thread separada para não travar o event loop
    def inferir():
        results = model(frame, conf=CONFIANCA_MINIMA, verbose=False)
        deteccoes = []
        for r in results:
            for box in r.boxes:
                nome_classe = model.names[int(box.cls)].lower()
                deteccoes.append({
                    "class": nome_classe,
                    "confidence": round(float(box.conf), 4),
                    "bbox": box.xyxy[0].tolist(),
                })
        return deteccoes

    deteccoes = await loop.run_in_executor(None, inferir)

    epis_encontrados = {d["class"] for d in deteccoes}
    
    # Verifica se os EPIs obrigatórios foram detectados
    conformidade = EPIS_OBRIGATORIOS.issubset(epis_encontrados) if EPIS_OBRIGATORIOS else True
    status = "conforme" if conformidade else "nao_conforme"
    confianca = max((d["confidence"] for d in deteccoes), default=0.0)

    return {
        "camera_id": camera_id,
        "status": status,
        "detections": deteccoes,
        "epi_detected": list(epis_encontrados),
        "confidence": confianca,
    }


async def processar_stream_camera(camera_id: int, rtsp_url: str, sector_id: int):
    """
    Lê frames do RTSP com OpenCV, roda YOLOv8 e salva ocorrências no banco.
    Roda em background enquanto a detecção estiver ativa.
    """
    from app.core.database import AsyncSessionLocal
    from app.models.occurrence import Occurrence, OccurrenceStatus

    logger.info(f"Iniciando detecção na câmera {camera_id} → {rtsp_url}")
    cap = cv2.VideoCapture(rtsp_url)

    if not cap.isOpened():
        logger.error(f"Não foi possível abrir o stream RTSP da câmera {camera_id}")
        return

    INTERVALO_FRAMES = 30       # analisa 1 a cada 30 frames (~1 FPS em 30fps)
    INTERVALO_SALVAR = 60       # salva no banco no máximo 1 ocorrência por minuto por câmera
    frame_count = 0
    ultimo_save = datetime.utcnow()

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                logger.warning(f"Stream da câmera {camera_id} interrompido. Tentando reconectar...")
                await asyncio.sleep(5)
                cap.release()
                cap = cv2.VideoCapture(rtsp_url)
                continue

            frame_count += 1
            if frame_count % INTERVALO_FRAMES != 0:
                await asyncio.sleep(0)
                continue

            resultado = await analisar_frame(camera_id, frame)

            agora = datetime.utcnow()
            segundos_desde_save = (agora - ultimo_save).total_seconds()

            # Salva no banco apenas se não conforme E passou o intervalo mínimo
            if resultado["status"] == "nao_conforme" and segundos_desde_save >= INTERVALO_SALVAR:
                # Salva imagem do frame como evidência
                image_path = None
                try:
                    img_dir = f"hls_streams/{camera_id}/frames"
                    os.makedirs(img_dir, exist_ok=True)
                    image_path = f"{img_dir}/{int(agora.timestamp())}.jpg"
                    cv2.imwrite(image_path, frame)
                except Exception:
                    pass

                async with AsyncSessionLocal() as db:
                    occ = Occurrence(
                        camera_id=camera_id,
                        sector_id=sector_id,
                        status=OccurrenceStatus.nao_conforme,
                        epi_detected=resultado["epi_detected"],
                        confidence=resultado["confidence"],
                        image_path=image_path,
                        timestamp=agora,
                    )
                    db.add(occ)
                    await db.commit()
                    logger.info(
                        f"Ocorrência salva — câmera {camera_id}, "
                        f"EPIs: {resultado['epi_detected']}, "
                        f"confiança: {resultado['confidence']:.2f}"
                    )
                ultimo_save = agora

            await asyncio.sleep(0)  # cede controle ao event loop

    except asyncio.CancelledError:
        logger.info(f"Detecção encerrada para câmera {camera_id}")
    finally:
        cap.release()


# ── Inicialização automática na subida do servidor ─────────────────────────────

async def start_camera_streams():
    """Inicia HLS + detecção para todas as câmeras ativas ao subir o servidor."""
    await asyncio.sleep(2)  # aguarda banco inicializar

    try:
        from app.core.database import AsyncSessionLocal
        from app.models.camera import Camera
        from sqlalchemy import select

        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Camera).where(Camera.is_active == True))
            cameras = result.scalars().all()

        for cam in cameras:
            if cam.rtsp_url:
                iniciar_hls(cam.id, cam.rtsp_url)
                # Inicia detecção se modelo existir
                if os.path.exists(MODEL_PATH):
                    sector_id = cam.sector_id or 1
                    task = asyncio.create_task(
                        processar_stream_camera(cam.id, cam.rtsp_url, sector_id)
                    )
                    tarefas_deteccao[cam.id] = task
                    logger.info(f"Detecção YOLOv8 iniciada: câmera {cam.id}")
                else:
                    logger.warning(
                        f"best.pt não encontrado em '{MODEL_PATH}'. "
                        "Só o HLS foi iniciado. Coloque o modelo treinado no caminho correto."
                    )

    except Exception as e:
        logger.warning(f"start_camera_streams: erro — {e}")

    try:
        while True:
            await asyncio.sleep(60)
    except asyncio.CancelledError:
        logger.info("start_camera_streams cancelado.")


# ── Stub de compatibilidade ────────────────────────────────────────────────────

async def analyze_frame(camera_id: int, frame_data: bytes) -> dict:
    """Mantido para compatibilidade. Use analisar_frame() com numpy diretamente."""
    nparr = np.frombuffer(frame_data, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        return {"status": "erro", "detections": [], "epi_detected": [], "confidence": 0.0}
    return await analisar_frame(camera_id, frame)