from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class SectorBase(BaseModel):
    name: str
    description: Optional[str] = None


class SectorCreate(SectorBase):
    pass


class SectorUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class SectorResponse(SectorBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}
