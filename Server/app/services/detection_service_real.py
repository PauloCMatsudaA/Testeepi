import subprocess
import os
import asyncio
from fastapi import APIRouter
from fastapi.staticfiles import StaticFiles

HLS_DIR = "hls_streams"
os.makedirs(HLS_DIR, exist_ok=True)

processos_ffmpeg: dict[int, subprocess.Popen] = {}

def iniciar_hls(camera_id: int, rtsp_url: str):
    """Converte RTSP → HLS com FFmpeg e salva segmentos em disco."""
    pasta = os.path.join(HLS_DIR, str(camera_id))
    os.makedirs(pasta, exist_ok=True)
    m3u8 = os.path.join(pasta, "index.m3u8")

    if camera_id in processos_ffmpeg:
        return  # já está rodando

    cmd = [
        "ffmpeg",
        "-rtsp_transport", "tcp",
        "-i", rtsp_url,
        "-c:v", "copy",        # sem re-encode = menor latência
        "-an",                 # sem áudio
        "-hls_time", "2",      # segmentos de 2s
        "-hls_list_size", "5", # mantém últimos 5 segmentos
        "-hls_flags", "delete_segments",
        "-y", m3u8,
    ]
    proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    processos_ffmpeg[camera_id] = proc

def parar_hls(camera_id: int):
    proc = processos_ffmpeg.pop(camera_id, None)
    if proc:
        proc.terminate()