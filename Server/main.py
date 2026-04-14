import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal, init_db
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.sector import Sector
from app.api import notifications

from app.api import reports 

import app.models  # noqa: F401

from app.api import (
    auth,
    users,
    occurrences,
    epi_requests,
    cameras,
    sectors,
    dashboard,
    detection,
)
from app.services.detection_service_real import start_camera_streams

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def create_default_admin():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Sector).where(Sector.name == "Geral"))
        default_sector = result.scalar_one_or_none()

        if not default_sector:
            default_sector = Sector(
                name="Geral",
                description="Setor padrão do sistema",
            )
            db.add(default_sector)
            await db.flush()
            await db.refresh(default_sector)
            logger.info("Setor padrão 'Geral' criado.")

        result = await db.execute(select(User).where(User.email == "admin@episee.com"))
        admin = result.scalar_one_or_none()

        if not admin:
            admin = User(
                name="Administrador EPIsee",
                email="admin@episee.com",
                hashed_password=get_password_hash("admin123"),
                role=UserRole.gestor,
                sector_id=default_sector.id,
                phone="+5511999999999",
                is_active=True,
            )
            db.add(admin)
            await db.flush()
            logger.info("Usuário padrão admin@episee.com criado.")

        await db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("EPIsee Backend iniciando...")

    await init_db()
    logger.info("Tabelas criadas/verificadas no banco de dados.")

    await create_default_admin()

    camera_task = asyncio.create_task(start_camera_streams())
    logger.info("Serviço de câmeras iniciado em background.")

    logger.info("EPIsee Backend pronto. Acesse /docs para a documentação.")
    yield

    logger.info("Encerrando serviço de câmeras...")
    camera_task.cancel()
    try:
        await camera_task
    except asyncio.CancelledError:
        logger.info("Serviço de câmeras encerrado com sucesso.")

    logger.info("EPIsee Backend encerrando.")


# ── Instância principal ────────────────────────────────────────────────────
app = FastAPI(
    title="EPIsee API",
    description=(
        "Backend do sistema EPIsee — detecção de EPIs e gestão de segurança do trabalho.\n\n"
        "**Usuário padrão:** admin@episee.com | **Senha:** admin123\n\n"
        "Acesse `/docs` para testar a API."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ───────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Arquivos estáticos HLS ─────────────────────────────────────────────────
os.makedirs("hls_streams", exist_ok=True)
app.mount("/hls", StaticFiles(directory="hls_streams"), name="hls")  # ← agora DEPOIS de app = FastAPI(...)

# ── Routers ────────────────────────────────────────────────────────────────
API_PREFIX = "/api"

app.include_router(auth.router,        prefix=API_PREFIX)
app.include_router(users.router,       prefix=API_PREFIX)
app.include_router(occurrences.router, prefix=API_PREFIX)
app.include_router(epi_requests.router,prefix=API_PREFIX)
app.include_router(cameras.router,     prefix=API_PREFIX)
app.include_router(sectors.router,     prefix=API_PREFIX)
app.include_router(dashboard.router,   prefix=API_PREFIX)
app.include_router(detection.router,   prefix=API_PREFIX)
app.include_router(reports.router,     prefix="/api")

app.include_router(notifications.router, prefix="/api")


# ── Health check ───────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "EPIsee API", "version": "1.0.0"}


@app.get("/", tags=["Health"])
async def root():
    return {
        "message": "EPIsee API está rodando.",
        "docs": "/docs",
        "health": "/health",
    }