from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    app_name: str = "Saan?"
    debug: bool = True
    port: int = 7272
    database_url: str = "sqlite:///./saan.db"
    secret_key: str = "change-me-for-production"
    google_client_id: str = ""
    admin_emails: str = ""
    walking_speed_kmh: float = 5.0

    feu_tech_lat: float = 14.6042
    feu_tech_lng: float = 120.9882
    feu_manila_lat: float = 14.60356
    feu_manila_lng: float = 120.98648

    model_config = SettingsConfigDict(env_file=ROOT_DIR / ".env", env_file_encoding="utf-8")

    @property
    def campuses(self) -> dict[str, dict[str, float | str]]:
        return {
            "feu_tech": {
                "key": "feu_tech",
                "name": "FEU Tech",
                "latitude": self.feu_tech_lat,
                "longitude": self.feu_tech_lng,
            },
            "feu_manila": {
                "key": "feu_manila",
                "name": "FEU Manila",
                "latitude": self.feu_manila_lat,
                "longitude": self.feu_manila_lng,
            },
        }

    @property
    def admin_email_set(self) -> set[str]:
        return {email.strip().lower() for email in self.admin_emails.split(",") if email.strip()}


@lru_cache
def get_settings() -> Settings:
    return Settings()
