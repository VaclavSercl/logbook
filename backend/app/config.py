"""Application configuration."""
from pydantic_settings import BaseSettings
from typing import List, Optional


class Settings(BaseSettings):
    APP_NAME: str = "Logbook"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    DATABASE_URL: str = "sqlite:///./logbook.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "change-me-in-production-secret-key-32chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://100.115.0.40:3000",
        "http://100.115.0.40:3001",
        "http://100.115.0.40:8000",
        "http://10.0.1.197:3000",
        "http://10.0.1.197:3001",
        "http://10.0.1.197:8000",
    ]
    STORAGE_PATH: str = "./storage"
    AI_ENABLED: bool = True
    OLLAMA_URL: str = "http://localhost:11434"
    GOOGLE_API_KEY: Optional[str] = None
    OPENROUTER_API_KEY: Optional[str] = None
    TELEGRAM_BOT_TOKEN: Optional[str] = None
    TELEGRAM_CHAT_ID: Optional[int] = None

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
