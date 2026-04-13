from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_manager
from app.models.user import User
from app.models.camera import Camera
from app.schemas.camera import CameraCreate, CameraUpdate, CameraResponse, DetectionControl
from app.services.detection_service_real import iniciar_hls, parar_hls


router = APIRouter(prefix="/cameras", tags=["Cameras"])


@router.post("/{camera_id}/start-detection")
async def start_detection(camera_id: int, db=Depends(get_db), _=Depends(get_current_manager)):
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(404, "Câmera não encontrada")

    iniciar_hls(camera_id, camera.rtsp_url)
    return {"camera_id": camera_id, "hls_url": f"/hls/{camera_id}/index.m3u8"}

@router.get("/", response_model=List[CameraResponse])
async def list_cameras(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """List all cameras."""
    result = await db.execute(select(Camera).order_by(Camera.name))
    cameras = result.scalars().all()
    return [CameraResponse.model_validate(c) for c in cameras]


@router.post("/", response_model=CameraResponse, status_code=status.HTTP_201_CREATED)
async def create_camera(
    camera_in: CameraCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_manager),
):
    """Create a new camera. Manager only."""
    camera = Camera(
        name=camera_in.name,
        sector_id=camera_in.sector_id,
        rtsp_url=camera_in.rtsp_url,
        is_active=camera_in.is_active,
    )
    db.add(camera)
    await db.flush()
    await db.refresh(camera)
    return CameraResponse.model_validate(camera)


@router.patch("/{camera_id}", response_model=CameraResponse)
async def update_camera(
    camera_id: int,
    camera_in: CameraUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_manager),
):
    """Update a camera. Manager only."""
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Câmera não encontrada")

    for field, value in camera_in.model_dump(exclude_unset=True).items():
        setattr(camera, field, value)

    await db.flush()
    await db.refresh(camera)
    return CameraResponse.model_validate(camera)


@router.delete("/{camera_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_camera(
    camera_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_manager),
):
    """Delete a camera. Manager only."""
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Câmera não encontrada")
    await db.delete(camera)
    await db.flush()


@router.post("/{camera_id}/start-detection", response_model=DetectionControl)
async def start_detection(
    camera_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_manager),
):
    """
    STUB — Start YOLOv8 detection on the given camera.

    To implement: load the trained model (best.pt) and start reading frames
    from the camera's RTSP stream using OpenCV. See detection_service.py for
    complete instructions.
    """
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Câmera não encontrada")

    # Update last_seen timestamp as a stub signal
    camera.last_seen = datetime.utcnow()
    await db.flush()

    return DetectionControl(
        camera_id=camera_id,
        action="start",
        message="STUB: detecção não implementada. Consulte detection_service.py para instruções YOLOv8.",
        instructions=(
            "1. Instale ultralytics: pip install ultralytics\n"
            "2. Treine o modelo com seu dataset de EPIs\n"
            "3. Substitua o stub em detection_service.py pela inferência real\n"
            "4. Conecte ao stream RTSP desta câmera com OpenCV\n"
            f"   rtsp_url: {camera.rtsp_url or 'não configurada'}"
        ),
    )


@router.post("/{camera_id}/stop-detection", response_model=DetectionControl)
async def stop_detection(
    camera_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_manager),
):
    """STUB — Stop YOLOv8 detection on the given camera."""
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Câmera não encontrada")

    return DetectionControl(
        camera_id=camera_id,
        action="stop",
        message="STUB: detecção não implementada. Nenhum processo ativo para encerrar.",
    )
