from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    pass


settings = get_settings()
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    ensure_user_columns()
    ensure_store_tables()


def ensure_user_columns() -> None:
    if not settings.database_url.startswith("sqlite"):
        return

    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("users")}
    with engine.begin() as connection:
        if "google_sub" not in columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN google_sub VARCHAR(255)"))
            connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_google_sub ON users (google_sub)"))


def ensure_store_tables() -> None:
    if not settings.database_url.startswith("sqlite"):
        return

    inspector = inspect(engine)
    table_names = inspector.get_table_names()
    if "food_spots" not in table_names:
        return

    food_columns = {column["name"] for column in inspector.get_columns("food_spots")}
    with engine.begin() as connection:
        if "stores" not in table_names:
            connection.execute(
                text(
                    """
                    CREATE TABLE stores (
                        id INTEGER NOT NULL PRIMARY KEY,
                        name VARCHAR(120) NOT NULL,
                        latitude FLOAT NOT NULL,
                        longitude FLOAT NOT NULL,
                        area VARCHAR(100) NOT NULL,
                        rating FLOAT NOT NULL DEFAULT 4.0,
                        image_url VARCHAR(500),
                        is_active BOOLEAN NOT NULL DEFAULT 1,
                        created_at DATETIME
                    )
                    """
                )
            )
            connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_stores_name ON stores (name)"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_stores_area ON stores (area)"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_stores_is_active ON stores (is_active)"))

        if "store_id" not in food_columns:
            connection.execute(text("ALTER TABLE food_spots ADD COLUMN store_id INTEGER"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_food_spots_store_id ON food_spots (store_id)"))

        connection.execute(
            text(
                """
                INSERT OR IGNORE INTO stores (name, latitude, longitude, area, rating, image_url, is_active, created_at)
                SELECT
                    restaurant,
                    latitude,
                    longitude,
                    area,
                    MAX(rating),
                    MAX(image_url),
                    MAX(CASE WHEN is_active THEN 1 ELSE 0 END),
                    CURRENT_TIMESTAMP
                FROM food_spots
                WHERE restaurant IS NOT NULL AND restaurant != ''
                GROUP BY restaurant
                """
            )
        )
        connection.execute(
            text(
                """
                UPDATE food_spots
                SET store_id = (
                    SELECT stores.id FROM stores WHERE stores.name = food_spots.restaurant
                )
                WHERE store_id IS NULL
                """
            )
        )
