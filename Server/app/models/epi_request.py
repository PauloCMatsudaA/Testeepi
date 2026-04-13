from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class EPIRequestStatus(str, enum.Enum):
    pendente = "pendente"
    aprovada = "aprovada"
    rejeitada = "rejeitada"


class EPIRequest(Base):
    __tablename__ = "epi_requests"

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sector_id = Column(Integer, ForeignKey("sectors.id"), nullable=False)
    epi_type = Column(String(100), nullable=False)
    reason = Column(Text, nullable=True)
    status = Column(
        Enum(EPIRequestStatus),
        nullable=False,
        default=EPIRequestStatus.pendente,
    )
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # Relationships
    worker = relationship(
        "User", foreign_keys=[worker_id], back_populates="epi_requests"
    )
    manager = relationship(
        "User", foreign_keys=[manager_id], back_populates="managed_requests"
    )
    sector = relationship("Sector", back_populates="epi_requests")
