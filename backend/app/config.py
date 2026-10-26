from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str
    anthropic_api_key: str = ""
    secret_key: str = "dev-only-change-me"
    access_token_minutes: int = 60 * 24 * 7   # 7 days
    verify_token_minutes: int = 60 * 24       # email confirmation link lasts 24 hours
    cors_origins: list[str] = ["http://localhost:5173"]

    frontend_url: str = "http://localhost:5173"
    backend_url: str = "http://localhost:8000"
    require_verified_email: bool = False
    google_client_id: str = ""

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent.parent / ".env",
        extra="ignore",
    )

settings = Settings()