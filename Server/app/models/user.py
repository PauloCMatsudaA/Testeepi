from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class UserRole(str, enum.Enum):
    gestor = "gestor"
    trabalhador = "trabalhador"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    email = Column(String(200), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.trabalhador)
    sector_id = Column(Integer, ForeignKey("sectors.id"), nullable=True)
    phone = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    sector = relationship("Sector", back_populates="users")
    epi_requests = relationship(
        "EPIRequest",
        foreign_keys="EPIRequest.worker_id",
        back_populates="worker",
        lazy="selectin",
    )
    managed_requests = relationship(
        "EPIRequest",
        foreign_keys="EPIRequest.manager_id",
        back_populates="manager",
        lazy="selectin",
    )
