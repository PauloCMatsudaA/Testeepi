from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.notification import Notification
from pydantic import BaseModel
from typing import List
from datetime import datetime

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class NotificationOut(BaseModel):
    id:        int
    tipo:      str
    texto:     str
    lida:      bool
    criado_em: datetime

    model_config = {"from_attributes": True}


@router.get("/", response_model=List[NotificationOut])
async def listar_notificacoes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna as últimas 50 notificações do usuário logado."""
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.criado_em.desc())
        .limit(50)
    )
    return result.scalars().all()


@router.get("/unread-count")
async def contar_nao_lidas(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna quantas notificações não lidas o usuário tem."""
    result = await db.execute(
        select(Notification).where(
            Notification.user_id == current_user.id,
            Notification.lida == False,
        )
    )
    return {"count": len(result.scalars().all())}


@router.patch("/{notification_id}/read")
async def marcar_lida(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Marca uma notificação como lida."""
    await db.execute(
        update(Notification)
        .where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
        .values(lida=True)
    )
    await db.commit()
    return {"ok": True}


@router.patch("/read-all")
async def marcar_todas_lidas(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Marca todas as notificações do usuário como lidas."""
    await db.execute(
        update(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.lida == False,
        )
        .values(lida=True)
    )
    await db.commit()
    return {"ok": True}