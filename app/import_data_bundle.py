from __future__ import annotations

import argparse
import hashlib
import re
import shutil
from pathlib import Path

from app.database import SessionLocal, init_db
from app.models import FoodSpot, Store


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "Data"
DEFAULT_UPLOAD_ROOT = ROOT / "app" / "static" / "uploads" / "foods" / "data-bundle"

STORE_PROFILES = {
    "dimsum treats kitchen españa morayta": {
        "canonical_name": "Dimsum Treats",
        "latitude": 14.6038,
        "longitude": 120.9887,
        "area": "lerma",
        "rating": 4.4,
    },
    "famous belgian waffles": {
        "canonical_name": "Famous Belgian Waffles",
        "latitude": 14.6042,
        "longitude": 120.9882,
        "area": "near_feu_tech",
        "rating": 4.2,
    },
    "km grubs": {
        "canonical_name": "KM Grubs",
        "latitude": 14.6042,
        "longitude": 120.9882,
        "area": "near_feu_tech",
        "rating": 4.2,
    },
    "mangan tamu pu": {
        "canonical_name": "Mangan Tamu Pu",
        "latitude": 14.6042,
        "longitude": 120.9882,
        "area": "near_feu_tech",
        "rating": 4.1,
    },
    "shawarma shack": {
        "canonical_name": "Shawarma Shack Morayta",
        "latitude": 14.6046,
        "longitude": 120.9891,
        "area": "near_feu_manila",
        "rating": 4.2,
    },
    "crambayan": {
        "canonical_name": "Crambayan",
        "latitude": 14.6039,
        "longitude": 120.9876,
        "area": "lerma",
        "rating": 4.2,
    },
    "munchbox express": {
        "canonical_name": "Munchbox Express",
        "latitude": 14.6039,
        "longitude": 120.9876,
        "area": "lerma",
        "rating": 4.2,
    },
    "pandog": {
        "canonical_name": "PANDOG",
        "latitude": 14.6048,
        "longitude": 120.9890,
        "area": "near_feu_manila",
        "rating": 4.0,
    },
}

AREA_FALLBACKS = {
    "feu tech": ("near_feu_tech", 14.6042, 120.9882),
    "feu manila": ("near_feu_manila", 14.6048, 120.9893),
    "lerma": ("lerma", 14.6039, 120.9876),
    "p campa": ("p_campa", 14.6025, 120.9901),
    "obscure cafe": ("p_campa", 14.6025, 120.9901),
    "pandog": ("near_feu_manila", 14.6048, 120.9890),
}

SPECIAL_TOKENS = {"KM", "B1T1", "DCC", "FEU", "PANDOG"}


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "item"


def display_token(token: str) -> str:
    if not token:
        return token
    if token in SPECIAL_TOKENS or any(char.isdigit() for char in token):
        return token.upper()
    if token.isalpha() and token.isupper() and len(token) <= 3:
        return token.upper()
    return token[:1].upper() + token[1:].lower()


def prettify_name(raw: str) -> str:
    cleaned = raw.replace("–", "-").replace("—", "-")
    cleaned = cleaned.replace("w_", "with ").replace("W_", "with ")
    cleaned = cleaned.replace("_", " ")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    cleaned = re.sub(r"\s+with\s+with\b", " with", cleaned, flags=re.I)
    cleaned = cleaned.replace("S mores", "S'mores")
    return " ".join(display_token(part) for part in cleaned.split())


def parse_price_range(text: str) -> tuple[int, int]:
    match = re.search(r"₱\s*(\d{1,4})(?:\s*-\s*(\d{1,4}))?", text)
    if match:
        low = int(match.group(1))
        high = int(match.group(2) or match.group(1))
        return (low, high)

    trailing = re.search(r"(\d{1,4})(?:\s*-\s*(\d{1,4}))?\s*$", text)
    if trailing:
        low = int(trailing.group(1))
        high = int(trailing.group(2) or trailing.group(1))
        return (low, high)

    return (0, 0)


def detect_image_extension(path: Path) -> str:
    header = path.read_bytes()[:16]
    if header.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if header.startswith(b"GIF87a") or header.startswith(b"GIF89a"):
        return ".gif"
    if header[:4] == b"RIFF" and header[8:12] == b"WEBP":
        return ".webp"
    return path.suffix.lower() if path.suffix else ".jpg"


def infer_category(name: str, restaurant: str) -> str:
    text = f"{name} {restaurant}".lower()
    if any(term in text for term in ["coffee", "latte", "americano", "brew", "matcha", "mocha", "cappuccino", "tsokolate", "tea", "smoothie", "frappe", "float", "mojito", "lemonade", "soda", "espresso"]):
        return "coffee_drinks"
    if any(term in text for term in ["siomai", "fishball", "kikiam", "takoyaki"]):
        return "dimsum" if "siomai" in text else "street_food"
    if any(term in text for term in ["waffle", "cookie", "cake", "tart", "mookies", "revel", "banana", "oreo", "melt", "burger", "sandwich", "toast"]):
        return "snacks"
    if any(term in text for term in ["shawarma", "kebab"]):
        return "rice_meals" if "rice" in text or "bowl" in text else "snacks"
    if any(term in text for term in ["wings", "sisig", "silog", "rice", "meal", "ulam", "bowl", "porkchop", "liempo", "inasal", "tapsilog", "longsilog", "bacsilog", "canton", "pastil", "cordon", "parmigiana", "teriyaki", "guisado", "toppings", "pasta", "fajitas", "carbonara"]):
        return "chicken" if any(term in text for term in ["chicken", "inasal", "karaage"]) else "rice_meals"
    return "snacks"


def infer_mood(category: str, name: str, price_max: int, restaurant: str) -> str:
    text = f"{name} {restaurant}".lower()
    if any(term in text for term in ["late", "pares", "sisig", "shawarma", "street", "wings"]):
        return "late_night"
    if category == "coffee_drinks":
        return "study_fuel" if price_max <= 180 else "chill_hangout"
    if category == "dimsum" or any(term in text for term in ["fishball", "kikiam", "takoyaki", "cookie", "waffle", "burger", "sandwich"]):
        return "quick_lunch" if price_max <= 120 else "chill_hangout"
    if category == "chicken":
        return "quick_lunch" if price_max <= 160 else "group_meal"
    if category == "rice_meals":
        return "quick_lunch" if price_max <= 140 else "study_fuel"
    if price_max <= 90:
        return "quick_lunch"
    return "chill_hangout"


def infer_profile(folder_name: str, top_level: str) -> dict[str, object]:
    key = folder_name.lower().strip()
    if key in STORE_PROFILES:
        return STORE_PROFILES[key]

    top_key = top_level.lower().strip()
    area, latitude, longitude = AREA_FALLBACKS.get(top_key, ("near_feu_tech", 14.6042, 120.9882))
    return {
        "canonical_name": folder_name,
        "latitude": latitude,
        "longitude": longitude,
        "area": area,
        "rating": 4.0,
    }


def import_bundle(source_root: Path, upload_root: Path, dry_run: bool = False) -> None:
    if not source_root.exists():
        raise FileNotFoundError(f"Data folder not found: {source_root}")

    init_db()
    db = SessionLocal()
    created_stores = 0
    updated_stores = 0
    created_foods = 0
    updated_foods = 0
    copied_images = 0
    skipped_files = 0
    seen_restaurants: set[str] = set()
    store_cache: dict[str, Store] = {
        store.name: store for store in db.query(Store).all()
    }
    food_cache: dict[tuple[str, str], FoodSpot] = {
        (food.restaurant, food.name): food for food in db.query(FoodSpot).all()
    }

    try:
        files = sorted(p for p in source_root.rglob("*") if p.is_file())
        for file_path in files:
            parent = file_path.parent
            if parent == source_root:
                continue

            restaurant_folder = parent.name
            top_level = parent.parent.name if parent.parent != source_root.parent else source_root.name
            profile = infer_profile(restaurant_folder, top_level)
            canonical_name = str(profile["canonical_name"])
            restaurant_key = slugify(canonical_name)

            item_name = prettify_name(file_path.stem)
            price_min, price_max = parse_price_range(file_path.stem)
            category = infer_category(item_name, canonical_name)
            mood = infer_mood(category, item_name, price_max or price_min or 0, canonical_name)
            if price_min == 0 and price_max == 0:
                fallback_prices = {
                    "coffee_drinks": (95, 145),
                    "dimsum": (55, 95),
                    "street_food": (25, 60),
                    "rice_meals": (85, 140),
                    "chicken": (90, 150),
                    "burgers": (85, 145),
                    "snacks": (60, 120),
                    "unli_rice": (199, 299),
                }
                price_min, price_max = fallback_prices.get(category, (80, 120))

            ext = detect_image_extension(file_path)
            image_name = f"{slugify(item_name)}-{hashlib.sha1(str(file_path).encode('utf-8')).hexdigest()[:8]}{ext}"
            dest_dir = upload_root / restaurant_key
            dest_path = dest_dir / image_name
            image_url = f"/static/uploads/foods/data-bundle/{restaurant_key}/{image_name}"
            description = f"Imported from the local Data bundle for {canonical_name}."

            if not dry_run:
                dest_dir.mkdir(parents=True, exist_ok=True)
                shutil.copy2(file_path, dest_path)
                copied_images += 1

            store = store_cache.get(canonical_name)
            if not store:
                store = Store(
                    name=canonical_name,
                    latitude=float(profile["latitude"]),
                    longitude=float(profile["longitude"]),
                    area=str(profile["area"]),
                    rating=float(profile["rating"]),
                    image_url=image_url,
                    is_active=True,
                )
                db.add(store)
                store_cache[canonical_name] = store
                created_stores += 1
            else:
                store.latitude = float(profile["latitude"])
                store.longitude = float(profile["longitude"])
                store.area = str(profile["area"])
                store.rating = max(float(store.rating or 0), float(profile["rating"]))
                if not store.image_url:
                    store.image_url = image_url
                store.is_active = True
                updated_stores += 1

            food_key = (canonical_name, item_name)
            food = food_cache.get(food_key)
            if not food:
                food = FoodSpot(
                    store=store,
                    name=item_name,
                    restaurant=canonical_name,
                    price_min=price_min,
                    price_max=price_max,
                    category=category,
                    mood=mood,
                    latitude=float(profile["latitude"]),
                    longitude=float(profile["longitude"]),
                    area=str(profile["area"]),
                    rating=float(profile["rating"]),
                    image_url=image_url,
                    description=description,
                    is_active=True,
                )
                db.add(food)
                food_cache[food_key] = food
                created_foods += 1
            else:
                food.store = store
                food.price_min = price_min
                food.price_max = price_max
                food.category = category
                food.mood = mood
                food.latitude = float(profile["latitude"])
                food.longitude = float(profile["longitude"])
                food.area = str(profile["area"])
                food.rating = float(profile["rating"])
                food.image_url = image_url
                food.description = description
                food.is_active = True
                updated_foods += 1

            seen_restaurants.add(canonical_name)

        if not dry_run:
            db.commit()

        print(
            f"Imported {len(files)} files from {source_root.name}: "
            f"{created_stores} stores created, {updated_stores} stores updated, "
            f"{created_foods} foods created, {updated_foods} foods updated, "
            f"{copied_images} images copied, {skipped_files} skipped."
        )
        print("Restaurants processed:", ", ".join(sorted(seen_restaurants)))
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Import the local Data bundle into the Saan database.")
    parser.add_argument("--source", default=str(DEFAULT_SOURCE), help="Path to the Data folder.")
    parser.add_argument("--uploads", default=str(DEFAULT_UPLOAD_ROOT), help="Destination folder for copied images.")
    parser.add_argument("--dry-run", action="store_true", help="Scan and report without writing files or database rows.")
    args = parser.parse_args()

    import_bundle(Path(args.source), Path(args.uploads), dry_run=args.dry_run)


if __name__ == "__main__":
    main()
