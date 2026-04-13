from fastapi import APIRouter, Depends, File, UploadFile, Form
from fastapi.responses import JSONResponse

from app.core.deps import get_current_user
from app.models.user import User
from app.services.detection_service_real import analyze_frame


router = APIRouter(prefix="/detection", tags=["Detection"])


@router.post("/analyze-frame")
async def analyze_frame(
    camera_id: int = Form(...),
    frame: UploadFile = File(...),
    _: User = Depends(get_current_user),
):
    """
    STUB endpoint for YOLOv8 EPI detection on a single video frame.

    Expected input:
    - camera_id: int (form field)
    - frame: image file (JPEG/PNG)

    When implemented, this endpoint will:
    1. Decode the uploaded image frame
    2. Run YOLOv8 inference (best.pt) to detect EPIs
    3. Return detected objects with classes, confidence scores, and bounding boxes
    4. Create an Occurrence record if non-compliance is detected

    See app/services/detection_service.py for full implementation instructions.
    """
    frame_data = await frame.read()
    result = await analyze_frame_stub(camera_id=camera_id, frame_data=frame_data)
    return JSONResponse(content=result)
