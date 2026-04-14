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

# Caminho do modelo treinado — coloque o best.pt dentro da pasta raiz do Server/
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "..", "best.pt")

# Classes exatas do seu data.yaml de treinamento:
# 0: person  1: glasses  2: face-mask-medical  3: face-guard
# 4: earmuffs  5: gloves  6: safety-vest  7: helmet
# 8: medical-suit  9: safety-suit
CLASSE_PESSOA = {"person"}  # classe 0 — separa pessoa dos EPIs

CLASSES_EPI = {
    "glasses",            # 1
    "face-mask-medical",  # 2
    "face-guard",         # 3
    "earmuffs",           # 4
    "gloves",             # 5
    "safety-vest",        # 6
    "helmet",             # 7
    "medical-suit",       # 8
    "safety-suit",        # 9
}

# EPIs mínimos obrigatórios para considerar a pessoa "conforme"
# Ajuste conforme as regras do seu ambiente de trabalho
EPIS_OBRIGATORIOS = {"safety-vest", "helmet"}

CONFIANCA_MINIMA = 0.50  # ignora detecções abaixo de 50% de confiança

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

    task = tarefas_deteccao.pop(camera_id, None)
    if task:
        task.cancel()


# ── Detecção com YOLOv8 ────────────────────────────────────────────────────────

async def analisar_frame(camera_id: int, frame: np.ndarray) -> dict:
    """
    Roda YOLOv8 no frame e retorna resultado.

    Lógica de status:
    - 'sem_pessoa'   → nenhuma pessoa detectada no frame (ignora, não é violação)
    - 'conforme'     → pessoa detectada + todos os EPIs obrigatórios presentes ✅
    - 'nao_conforme' → pessoa detectada + falta pelo menos 1 EPI obrigatório ❌
    - 'erro'         → modelo não carregado
    """
    model = get_model()
    if model is None:
        return {
            "status": "erro",
            "detections": [],
            "epi_detected": [],
            "epis_ausentes": [],
            "pessoa_detectada": False,
            "confidence": 0.0,
        }

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

    classes_detectadas = {d["class"] for d in deteccoes}
    pessoa_detectada   = bool(classes_detectadas & CLASSE_PESSOA)
    epis_encontrados   = classes_detectadas & CLASSES_EPI
    epis_ausentes      = EPIS_OBRIGATORIOS - epis_encontrados

    if not pessoa_detectada:
        status = "sem_pessoa"    # frame sem pessoa → não registra violação
    elif not epis_ausentes:
        status = "conforme"      # pessoa + todos os EPIs obrigatórios ✅
    else:
        status = "nao_conforme"  # pessoa detectada, mas falta EPI ❌

    confianca = max((d["confidence"] for d in deteccoes), default=0.0)

    return {
        "camera_id":        camera_id,
        "status":           status,
        "detections":       deteccoes,
        "epi_detected":     list(epis_encontrados),
        "epis_ausentes":    list(epis_ausentes),
        "pessoa_detectada": pessoa_detectada,
        "confidence":       confianca,
    }


# ── Processamento contínuo do stream ──────────────────────────────────────────

async def processar_stream_camera(camera_id: int, rtsp_url: str, sector_id: int):
    """
    Lê frames do RTSP com OpenCV, roda YOLOv8 e:
    - Salva Occurrence no banco quando status == 'nao_conforme'
    - Cria Notification para todos os gestores ativos
    Roda em background enquanto a detecção estiver ativa.
    """
    from app.core.database import AsyncSessionLocal
    from app.models.occurrence import Occurrence, OccurrenceStatus

    logger.info(f"Iniciando detecção na câmera {camera_id} → {rtsp_url}")
    cap = cv2.VideoCapture(rtsp_url)

    if not cap.isOpened():
        logger.error(f"Não foi possível abrir o stream RTSP da câmera {camera_id}")
        return

    INTERVALO_FRAMES = 30   # analisa 1 a cada 30 frames (~1 FPS em stream 30fps)
    INTERVALO_SALVAR = 60   # salva no banco no máximo 1 ocorrência por minuto por câmera
    frame_count = 0
    ultimo_save = datetime.utcnow()

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                logger.warning(f"Stream da câmera {camera_id} interrompido. Reconectando...")
                await asyncio.sleep(5)
                cap.release()
                cap = cv2.VideoCapture(rtsp_url)
                continue

            frame_count += 1
            if frame_count % INTERVALO_FRAMES != 0:
                await asyncio.sleep(0)
                continue

            resultado = await analisar_frame(camera_id, frame)

            # Ignora frames sem pessoa ou conformes
            if resultado["status"] != "nao_conforme":
                await asyncio.sleep(0)
                continue

            agora = datetime.utcnow()
            if (agora - ultimo_save).total_seconds() < INTERVALO_SALVAR:
                await asyncio.sleep(0)
                continue

            # Salva frame como evidência
            image_path = None
            try:
                img_dir = f"hls_streams/{camera_id}/frames"
                os.makedirs(img_dir, exist_ok=True)
                image_path = f"{img_dir}/{int(agora.timestamp())}.jpg"
                cv2.imwrite(image_path, frame)
            except Exception:
                pass

            async with AsyncSessionLocal() as db:
                from sqlalchemy import select
                from app.models.user import User
                from app.models.notification import Notification

                # 1. Salva ocorrência
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
                await db.flush()  # gera occ.id antes do commit

                # 2. Monta texto da notificação
                ausentes_str = (
                    ", ".join(resultado["epis_ausentes"])
                    if resultado["epis_ausentes"]
                    else "EPI não identificado"
                )
                texto_notif = (
                    f"Pessoa sem EPI — Câmera {camera_id} | "
                    f"Faltando: {ausentes_str} | "
                    f"Confiança: {resultado['confidence'] * 100:.0f}%"
                )

                # 3. Cria notificação para cada gestor ativo
                gestores_res = await db.execute(
                    select(User).where(
                        User.role == "gestor",
                        User.is_active == True,
                    )
                )
                for gestor in gestores_res.scalars().all():
                    db.add(Notification(
                        user_id=gestor.id,
                        tipo="err",
                        texto=texto_notif,
                        lida=False,
                    ))

                await db.commit()
                logger.info(
                    f"Ocorrência #{occ.id} salva — câmera {camera_id} | "
                    f"EPIs detectados: {resultado['epi_detected']} | "
                    f"Faltando: {resultado['epis_ausentes']} | "
                    f"Confiança: {resultado['confidence']:.2f}"
                )

            ultimo_save = agora
            await asyncio.sleep(0)

    except asyncio.CancelledError:
        logger.info(f"Detecção encerrada para câmera {camera_id}")
    finally:
        cap.release()


# ── Inicialização automática na subida do servidor ────────────────────────────

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


# ── Stub de compatibilidade ───────────────────────────────────────────────────

async def analyze_frame(camera_id: int, frame_data: bytes) -> dict:
    """Mantido para compatibilidade com detection.py. Converte bytes → numpy e chama analisar_frame()."""
    nparr = np.frombuffer(frame_data, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        return {
            "status": "erro",
            "detections": [],
            "epi_detected": [],
            "epis_ausentes": [],
            "pessoa_detectada": False,
            "confidence": 0.0,
        }
    return await analisar_frame(camera_id, frame)