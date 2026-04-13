"""
EPIsee Chatbot — Entry point da aplicação FastAPI.

Execução:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.webhook import router as webhook_router

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)

app = FastAPI(
    title="EPIsee Chatbot",
    description="Chatbot especialista em EPIs via WhatsApp — NR-6, direitos do trabalhador e orientações de segurança.",
    version="1.0.0",
)

# CORS (necessário se integrar com painel web do EPIsee)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rotas
app.include_router(webhook_router, prefix="/api/v1", tags=["WhatsApp Webhook"])


@app.get("/", tags=["Health"])
async def health_check():
    return {
        "status": "online",
        "service": "EPIsee Chatbot",
        "version": "1.0.0",
    }


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok"}
