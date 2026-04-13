from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./episee.db"
    SECRET_KEY: str = "episee_secret_key_change_in_production_very_long_string_here"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    CORS_ORIGINS: List[str] = ["*"]

    # ── E-mail (preencha no .env) ──────────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = "engs-pauloalmeida@gmail.com"        # seu e-mail: ex: episee@gmail.com
    SMTP_PASSWORD: str = ""    # senha de app do Gmail (não a senha normal)
    EMAIL_FROM: str = "engs-pauloalmeida@gmail.com"       

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()