from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_manager
from app.models.user import User
from app.models.sector import Sector
from app.schemas.sector import SectorCreate, SectorUpdate, SectorResponse

router = APIRouter(prefix="/sectors", tags=["Sectors"])


@router.get("/", response_model=List[SectorResponse])
async def list_sectors(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """List all sectors."""
    result = await db.execute(select(Sector).order_by(Sector.name))
    sectors = result.scalars().all()
    return [SectorResponse.model_validate(s) for s in sectors]


@router.get("/{sector_id}", response_model=SectorResponse)
async def get_sector(
    sector_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get a sector by ID."""
    result = await db.execute(select(Sector).where(Sector.id == sector_id))
    sector = result.scalar_one_or_none()
    if not sector:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Setor não encontrado")
    return SectorResponse.model_validate(sector)


@router.post("/", response_model=SectorResponse, status_code=status.HTTP_201_CREATED)
async def create_sector(
    sector_in: SectorCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_manager),
):
    """Create a new sector. Manager only."""
    result = await db.execute(select(Sector).where(Sector.name == sector_in.name))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Setor com este nome já existe",
        )

    sector = Sector(name=sector_in.name, description=sector_in.description)
    db.add(sector)
    await db.flush()
    await db.refresh(sector)
    return SectorResponse.model_validate(sector)


@router.patch("/{sector_id}", response_model=SectorResponse)
async def update_sector(
    sector_id: int,
    sector_in: SectorUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_manager),
):
    """Update a sector. Manager only."""
    result = await db.execute(select(Sector).where(Sector.id == sector_id))
    sector = result.scalar_one_or_none()
    if not sector:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Setor não encontrado")

    for field, value in sector_in.model_dump(exclude_unset=True).items():
        setattr(sector, field, value)

    await db.flush()
    await db.refresh(sector)
    return SectorResponse.model_validate(sector)


@router.delete("/{sector_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sector(
    sector_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_manager),
):
    """Delete a sector. Manager only."""
    result = await db.execute(select(Sector).where(Sector.id == sector_id))
    sector = result.scalar_one_or_none()
    if not sector:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Setor não encontrado")
    await db.delete(sector)
    await db.flush()
