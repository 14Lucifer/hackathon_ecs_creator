"""Application settings loaded from environment variables."""
from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg2://ecs_admin:change-me@postgres:5432/ecs_request"
    secret_key: str = "dev-secret-key"
    encryption_key: str = "dev-encryption-key"
    default_admin_password: str = "admin123"
    session_ttl_hours: int = 24

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
