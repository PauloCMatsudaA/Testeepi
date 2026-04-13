import subprocess
import os
import asyncio
import logging

logger = logging.getLogger(__name__)

HLS_DIR = "hls_streams"
os.makedirs(HLS_DIR, exist_ok=True)

processos_ffmpeg: dict[int, subprocess.Popen] = {}


def iniciar_hls(camera_id: int, rtsp_url: str):
    pasta = os.path.join(HLS_DIR, str(camera_id))
    os.makedirs(pasta, exist_ok=True)
    m3u8 = os.path.join(pasta, "index.m3u8")

    if camera_id in processos_ffmpeg:
        return

    cmd = [
        "ffmpeg",
        "-rtsp_transport", "tcp",
        "-i", rtsp_url,
        "-c:v", "copy",
        "-an",
        "-hls_time", "2",
        "-hls_list_size", "5",
        "-hls_flags", "delete_segments",
        "-y", m3u8,
    ]
    proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    processos_ffmpeg[camera_id] = proc
    logger.info(f"HLS iniciado para câmera {camera_id}")


def parar_hls(camera_id: int):
    proc = processos_ffmpeg.pop(camera_id, None)
    if proc:
        proc.terminate()


async def start_camera_streams():
    """
    Inicia HLS para câmeras ativas. Roda em background via asyncio.create_task.
    O delay de 2s garante que o banco já foi inicializado antes da query.
    """
    await asyncio.sleep(2)  # aguarda o banco estar 100% pronto

    try:
        from app.core.database import AsyncSessionLocal
        from app.models.camera import Camera
        from sqlalchemy import select

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Camera).where(Camera.is_active == True)
            )
            cameras = result.scalars().all()

        for cam in cameras:
            if cam.rtsp_url:
                iniciar_hls(cam.id, cam.rtsp_url)
                logger.info(f"Stream HLS iniciado: câmera {cam.id} → {cam.rtsp_url}")

    except Exception as e:
        logger.warning(f"start_camera_streams: não foi possível iniciar streams — {e}")

    # Mantém a task viva para o lifespan cancelar corretamente
    try:
        while True:
            await asyncio.sleep(60)
    except asyncio.CancelledError:
        logger.info("start_camera_streams cancelado.")


async def analyze_frame(camera_id: int, frame_data: bytes) -> dict:
    await asyncio.sleep(0)
    return {
        "status": "stub",
        "message": "YOLOv8 pendente. Veja app/services/detection_service.py",
        "camera_id": camera_id,
        "frame_size_bytes": len(frame_data),
        "detections": [],
        "epi_detected": [],
        "confidence": 0.0,
    }