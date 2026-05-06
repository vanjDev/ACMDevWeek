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
        created_stores = False
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
                        opens_at VARCHAR(5) NOT NULL DEFAULT '08:00',
                        closes_at VARCHAR(5) NOT NULL DEFAULT '21:00',
                        is_active BOOLEAN NOT NULL DEFAULT 1,
                        created_at DATETIME
                    )
                    """
                )
            )
            created_stores = True
            connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_stores_name ON stores (name)"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_stores_area ON stores (area)"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_stores_is_active ON stores (is_active)"))

        if "store_id" not in food_columns:
            connection.execute(text("ALTER TABLE food_spots ADD COLUMN store_id INTEGER"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_food_spots_store_id ON food_spots (store_id)"))

        store_columns = set()
        if not created_stores:
            store_columns = {column["name"] for column in inspect(engine).get_columns("stores")}
        if not created_stores and "opens_at" not in store_columns:
            connection.execute(text("ALTER TABLE stores ADD COLUMN opens_at VARCHAR(5) NOT NULL DEFAULT '08:00'"))
        if not created_stores and "closes_at" not in store_columns:
            connection.execute(text("ALTER TABLE stores ADD COLUMN closes_at VARCHAR(5) NOT NULL DEFAULT '21:00'"))

        connection.execute(text("UPDATE stores SET opens_at = '07:00', closes_at = '19:00' WHERE name IN ('FEU Tech Canteen', 'FEU Manila Canteen') AND opens_at = '08:00' AND closes_at = '21:00'"))
        connection.execute(text("UPDATE stores SET opens_at = '07:00', closes_at = '23:00' WHERE name = 'Jollibee Morayta' AND opens_at = '08:00' AND closes_at = '21:00'"))
        connection.execute(text("UPDATE stores SET opens_at = '00:00', closes_at = '23:59' WHERE name = 'McDonald''s Morayta' AND opens_at = '08:00' AND closes_at = '21:00'"))
        connection.execute(text("UPDATE stores SET opens_at = '10:00', closes_at = '23:30' WHERE name = 'Hepa Lane Street Food' AND opens_at = '08:00' AND closes_at = '21:00'"))
        connection.execute(text("UPDATE stores SET opens_at = '09:00', closes_at = '23:59' WHERE name = 'Paresan sa Lerma' AND opens_at = '08:00' AND closes_at = '21:00'"))
        connection.execute(text("UPDATE stores SET opens_at = '10:00', closes_at = '23:00' WHERE name IN ('P. Campa Sisigan', 'Morayta Wings Hub') AND opens_at = '08:00' AND closes_at = '21:00'"))

        connection.execute(
            text(
                """
                INSERT OR IGNORE INTO stores (name, latitude, longitude, area, rating, image_url, opens_at, closes_at, is_active, created_at)
                SELECT
                    restaurant,
                    latitude,
                    longitude,
                    area,
                    MAX(rating),
                    MAX(image_url),
                    CASE
                        WHEN restaurant = 'McDonald''s Morayta' THEN '00:00'
                        WHEN restaurant IN ('FEU Tech Canteen', 'FEU Manila Canteen', 'Jollibee Morayta') THEN '07:00'
                        WHEN restaurant IN ('Hepa Lane Street Food', 'P. Campa Sisigan', 'Morayta Wings Hub') THEN '10:00'
                        WHEN restaurant = 'Paresan sa Lerma' THEN '09:00'
                        ELSE '08:00'
                    END,
                    CASE
                        WHEN restaurant = 'McDonald''s Morayta' THEN '23:59'
                        WHEN restaurant IN ('Paresan sa Lerma') THEN '23:59'
                        WHEN restaurant = 'Hepa Lane Street Food' THEN '23:30'
                        WHEN restaurant IN ('Jollibee Morayta', 'P. Campa Sisigan', 'Morayta Wings Hub') THEN '23:00'
                        WHEN restaurant IN ('FEU Tech Canteen', 'FEU Manila Canteen') THEN '19:00'
                        WHEN mood = 'late_night' THEN '23:00'
                        ELSE '21:00'
                    END,
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
