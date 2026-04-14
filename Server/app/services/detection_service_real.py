import subprocess
import shutil
import os
import asyncio
import logging
import queue
import cv2
import numpy as np
from datetime import datetime
from threading import Thread

logger = logging.getLogger(__name__)

HLS_DIR = "hls_streams"
os.makedirs(HLS_DIR, exist_ok=True)

_base = os.path.dirname(__file__)
MODEL_PATH = os.path.join(_base, "..", "..", "best.pt")
if not os.path.exists(MODEL_PATH):
    MODEL_PATH = os.path.join(_base, "..", "..", "..", "best.pt")

VIDEO_FALLBACK = os.path.join(_base, "..", "..", "..", "teste.mp4")

CLASSE_PESSOA = {"person"}

CLASSES_EPI = {
    "glasses",
    "face-mask-medical",
    "face-guard",
    "earmuffs",
    "gloves",
    "safety-vest",
    "helmet",
    "medical-suit",
    "safety-suit",
}

EPIS_OBRIGATORIOS = {"helmet"}

CONFIANCA_MINIMA = 0.50
INTERVALO_SALVAR = 600
YOLO_INTERVALO   = 0.3

processos_ffmpeg: dict[int, subprocess.Popen] = {}
tarefas_deteccao: dict[int, asyncio.Task]     = {}

_model = None

FFMPEG_BIN = (
    shutil.which("ffmpeg")
    or r"C:\ProgramData\chocolatey\bin\ffmpeg.exe"
)


def get_model():
    global _model
    if _model is None:
        try:
            from ultralytics import YOLO
            _model = YOLO(MODEL_PATH)
            logger.info(f"[YOLO] Modelo carregado: {os.path.abspath(MODEL_PATH)}")
            logger.info(f"[YOLO] Classes: {_model.names}")
        except Exception as e:
            logger.error(f"[YOLO] Erro ao carregar modelo: {e}")
            _model = None
    return _model


def iniciar_hls(camera_id: int, rtsp_url: str):
    pasta = os.path.join(HLS_DIR, str(camera_id))
    os.makedirs(pasta, exist_ok=True)
    m3u8 = os.path.join(pasta, "index.m3u8")

    if camera_id in processos_ffmpeg:
        if processos_ffmpeg[camera_id].poll() is None:
            return
        del processos_ffmpeg[camera_id]

    if not FFMPEG_BIN:
        logger.error("[HLS] ffmpeg não encontrado!")
        return

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
        logger.info(f"[HLS] Iniciado câmera {camera_id}")
    except Exception as e:
        logger.error(f"[HLS] Erro ao iniciar ffmpeg: {e}")


def parar_hls(camera_id: int):
    proc = processos_ffmpeg.pop(camera_id, None)
    if proc:
        proc.terminate()
    task = tarefas_deteccao.pop(camera_id, None)
    if task:
        task.cancel()
    logger.info(f"[CAM {camera_id}] Stream e detecção encerrados.")


class FrameReader(Thread):

    def __init__(self, fonte: str, camera_id: int):
        super().__init__(daemon=True)
        self.fonte     = fonte
        self.camera_id = camera_id
        self.frame_q   = queue.Queue(maxsize=1)
        self.running   = True
        self.frame_num = 0

    def run(self):
        logger.info(f"[CAM {self.camera_id}] FrameReader tentando: {self.fonte}")
        cap = cv2.VideoCapture(self.fonte)

        if not cap.isOpened():
            fallback = os.path.abspath(VIDEO_FALLBACK)
            logger.warning(f"[CAM {self.camera_id}] RTSP falhou → fallback: {fallback}")
            self.fonte = fallback
            cap = cv2.VideoCapture(self.fonte)

        if not cap.isOpened():
            logger.error(f"[CAM {self.camera_id}] Não abriu nenhuma fonte!")
            return

        logger.info(f"[CAM {self.camera_id}] FrameReader OK → {self.fonte}")

        while self.running:
            ret, frame = cap.read()
            if not ret:
                if "teste.mp4" in self.fonte:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue
                logger.warning(f"[CAM {self.camera_id}] Frame perdido — reconectando em 3s...")
                cap.release()
                import time; time.sleep(3)
                cap = cv2.VideoCapture(self.fonte)
                continue

            self.frame_num += 1
            try:
                self.frame_q.get_nowait()
            except queue.Empty:
                pass
            self.frame_q.put((self.frame_num, frame))

        cap.release()
        logger.info(f"[CAM {self.camera_id}] FrameReader encerrado.")

    def stop(self):
        self.running = False


def inferir_frame(frame: np.ndarray) -> list[dict]:
    model = get_model()
    if model is None:
        return []
    results = model(frame, conf=CONFIANCA_MINIMA, verbose=False)
    deteccoes = []
    for r in results:
        for box in r.boxes:
            nome = model.names[int(box.cls)].lower()
            deteccoes.append({
                "class":      nome,
                "confidence": round(float(box.conf), 4),
                "bbox":       box.xyxy[0].tolist(),
            })
    return deteccoes


def avaliar_deteccoes(deteccoes: list[dict]) -> dict:
    classes          = {d["class"] for d in deteccoes}
    pessoa_detectada = bool(classes & CLASSE_PESSOA)
    epis_encontrados = classes & CLASSES_EPI
    epis_ausentes    = EPIS_OBRIGATORIOS - epis_encontrados

    if not pessoa_detectada:
        status = "sem_pessoa"
    elif not epis_ausentes:
        status = "conforme"
    else:
        status = "nao_conforme"

    confianca = max((d["confidence"] for d in deteccoes), default=0.0)

    return {
        "status":           status,
        "epi_detected":     list(epis_encontrados),
        "epis_ausentes":    list(epis_ausentes),
        "pessoa_detectada": pessoa_detectada,
        "confidence":       confianca,
        "detections":       deteccoes,
    }


async def salvar_ocorrencia(camera_id: int, sector_id: int, resultado: dict, frame: np.ndarray):
    from app.core.database import AsyncSessionLocal
    from app.models.occurrence import Occurrence, OccurrenceStatus
    from app.models.notification import Notification
    from app.models.user import User, UserRole
    from sqlalchemy import select

    image_path = None
    try:
        img_dir    = f"hls_streams/{camera_id}/frames"
        os.makedirs(img_dir, exist_ok=True)
        image_path = f"{img_dir}/{int(datetime.utcnow().timestamp())}.jpg"
        cv2.imwrite(image_path, frame)
    except Exception as e:
        logger.warning(f"[CAM {camera_id}] Erro ao salvar frame: {e}")

    try:
        async with AsyncSessionLocal() as db:
            occ = Occurrence(
                camera_id    = camera_id,
                sector_id    = sector_id,
                status       = OccurrenceStatus.nao_conforme,
                epi_detected = resultado["epi_detected"],
                confidence   = resultado["confidence"],
                image_path   = image_path,
                timestamp    = datetime.utcnow(),
            )
            db.add(occ)
            await db.flush()

            ausentes_str = ", ".join(resultado["epis_ausentes"]) or "EPI não identificado"
            texto = (
                f"⚠️ Pessoa sem EPI — Câmera {camera_id} | "
                f"Faltando: {ausentes_str} | "
                f"Confiança: {resultado['confidence'] * 100:.0f}%"
            )

            res = await db.execute(
                select(User).where(
                    User.role == UserRole.gestor,
                    User.is_active == True,
                )
            )
            gestores = res.scalars().all()
            logger.info(f"[CAM {camera_id}] Gestores para notificar: {len(gestores)}")

            for g in gestores:
                db.add(Notification(
                    user_id = g.id,
                    tipo    = "err",
                    texto   = texto,
                    lida    = False,
                ))

            await db.commit()
            logger.info(
                f"[CAM {camera_id}] Ocorrência #{occ.id} salva | "
                f"Faltando: {resultado['epis_ausentes']} | "
                f"Notificados: {len(gestores)} gestor(es)"
            )
    except Exception as e:
        logger.error(f"[CAM {camera_id}] Erro ao salvar ocorrência: {e}", exc_info=True)


async def processar_stream_camera(camera_id: int, rtsp_url: str, sector_id: int):
    logger.info(f"[CAM {camera_id}] Iniciando detecção real-time → {rtsp_url}")

    reader      = FrameReader(rtsp_url, camera_id)
    reader.start()
    ultimo_save = datetime.min
    loop        = asyncio.get_event_loop()

    try:
        while True:
            await asyncio.sleep(YOLO_INTERVALO)

            try:
                frame_num, frame = reader.frame_q.get(timeout=2)
            except queue.Empty:
                logger.warning(f"[CAM {camera_id}] Sem frames na queue — aguardando...")
                continue

            deteccoes = await loop.run_in_executor(None, inferir_frame, frame)
            resultado  = avaliar_deteccoes(deteccoes)

            logger.info(
                f"[CAM {camera_id}] Frame {frame_num:05d} | "
                f"status={resultado['status']} | "
                f"EPIs={resultado['epi_detected']} | "
                f"faltando={resultado['epis_ausentes']} | "
                f"conf={resultado['confidence']:.2f}"
            )

            if resultado["status"] != "nao_conforme":
                continue

            agora = datetime.utcnow()
            if (agora - ultimo_save).total_seconds() < INTERVALO_SALVAR:
                continue

            await salvar_ocorrencia(camera_id, sector_id, resultado, frame)
            ultimo_save = agora

    except asyncio.CancelledError:
        logger.info(f"[CAM {camera_id}] Detecção cancelada.")
    finally:
        reader.stop()


async def start_camera_streams():
    await asyncio.sleep(2)

    logger.info(">>> [STARTUP] start_camera_streams chamado <<<")

    try:
        from app.core.database import AsyncSessionLocal
        from app.models.camera import Camera
        from sqlalchemy import select

        async with AsyncSessionLocal() as db:
            result  = await db.execute(select(Camera).where(Camera.is_active == True))
            cameras = result.scalars().all()

        logger.info(f"[STARTUP] {len(cameras)} câmera(s) ativa(s) encontrada(s).")

        model_existe = os.path.exists(MODEL_PATH)
        logger.info(f"[STARTUP] best.pt encontrado: {model_existe} → {os.path.abspath(MODEL_PATH)}")

        for cam in cameras:
            url = cam.rtsp_url if cam.rtsp_url else os.path.abspath(VIDEO_FALLBACK)
            logger.info(f"[STARTUP] Câmera {cam.id} ({cam.name}) → {url}")

            iniciar_hls(cam.id, url)

            sector_id = cam.sector_id or 1
            task = asyncio.create_task(
                processar_stream_camera(cam.id, url, sector_id)
            )
            tarefas_deteccao[cam.id] = task
            logger.info(f"[STARTUP] Detecção real-time iniciada: câmera {cam.id}")

    except Exception as e:
        logger.error(f"[STARTUP] Erro: {e}", exc_info=True)

    try:
        while True:
            await asyncio.sleep(60)
    except asyncio.CancelledError:
        logger.info("[STARTUP] start_camera_streams encerrado.")


async def analyze_frame(camera_id: int, frame_data: bytes) -> dict:
    nparr = np.frombuffer(frame_data, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        return {
            "status": "erro", "detections": [], "epi_detected": [],
            "epis_ausentes": [], "pessoa_detectada": False, "confidence": 0.0,
        }
    deteccoes = inferir_frame(frame)
    return avaliar_deteccoes(deteccoes)


async def analisar_frame(camera_id: int, frame: np.ndarray) -> dict:
    deteccoes = await asyncio.get_event_loop().run_in_executor(None, inferir_frame, frame)
    return avaliar_deteccoes(deteccoes)