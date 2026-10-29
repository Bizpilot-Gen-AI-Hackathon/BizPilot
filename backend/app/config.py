from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str
    gemini_api_key: str = ""
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    secret_key: str = "dev-only-change-me"
    access_token_minutes: int = 60 * 24 * 7   # 7 days
    verify_token_minutes: int = 60 * 24       # email confirmation link lasts 24 hours
    cors_origins: list[str] = ["http://localhost:5173"]

    frontend_url: str = "http://localhost:5173"
    backend_url: str = "http://localhost:8000"
    require_verified_email: bool = False
    google_client_id: str = ""
    model_reasoning: str = "gemini:gemini-3.8-flash"
    model_fast: str = "gemini:gemini-3.5-flash-lite"
    model_bulk: str = "gemini:gemini-3.5-flash-lite"
    llm_daily_call_budget: int = 100
    llm_max_concurrency: int = 2
    llm_cache_ttl_seconds: int = 60
    llm_redact_pii: bool = True
    ussd_secret: str = ""
    ussd_demo_fallback: bool = False

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent.parent / ".env",
        extra="ignore",
    )

    @property
    def model_routes(self) -> dict[str, str]:
        return {
            "reasoning": self.model_reasoning,
            "fast": self.model_fast,
            "bulk": self.model_bulk,
        }

settings = Settings()