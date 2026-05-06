from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Saan?"
    debug: bool = True
    port: int = 8042
    database_url: str = "sqlite:///./saan.db"
    walking_speed_kmh: float = 5.0

    feu_tech_lat: float = 14.6042
    feu_tech_lng: float = 120.9882
    feu_manila_lat: float = 14.6033
    feu_manila_lng: float = 120.9892

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

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


@lru_cache
def get_settings() -> Settings:
    return Settings()
