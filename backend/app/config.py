from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    api_key: str = ""
    backend_url: str = "http://localhost:8000"

settings = Settings()
