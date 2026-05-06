import random
from collections.abc import Sequence

from sqlalchemy import Select, or_, select
from sqlalchemy.orm import Session

from app.models import FoodSpot
from app.schemas import FoodSpotResponse
from app.services.distance_service import campus_coordinates, haversine_meters, walking_minutes


def _split_csv(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip().lower() for item in value.split(",") if item.strip()]


def _base_query() -> Select[tuple[FoodSpot]]:
    return select(FoodSpot).where(FoodSpot.is_active.is_(True))


def serialize_food(food: FoodSpot, campus: str = "feu_tech") -> FoodSpotResponse:
    lat, lng = campus_coordinates(campus)
    distance = haversine_meters(lat, lng, food.latitude, food.longitude)
    data = FoodSpotResponse.model_validate(food)
    data.distance_m = round(distance, 1)
    data.walking_minutes = walking_minutes(distance)
    return data


def filter_foods(
    db: Session,
    budget_min: int | None = None,
    budget_max: int | None = None,
    category: str | None = None,
    mood: str | None = None,
    area: str | None = None,
    q: str | None = None,
    campus: str = "feu_tech",
    radius: int | None = None,
    sort: str = "distance",
    limit: int = 50,
) -> list[FoodSpotResponse]:
    query = _base_query()

    if budget_min is not None:
        query = query.where(FoodSpot.price_max >= budget_min)
    if budget_max is not None:
        query = query.where(FoodSpot.price_min <= budget_max)

    categories = _split_csv(category)
    if categories:
        query = query.where(FoodSpot.category.in_(categories))

    moods = _split_csv(mood)
    if moods:
        query = query.where(FoodSpot.mood.in_(moods))

    areas = _split_csv(area)
    if areas and "all" not in areas:
        query = query.where(FoodSpot.area.in_(areas))

    if q:
        term = f"%{q.strip()}%"
        query = query.where(
            or_(
                FoodSpot.name.ilike(term),
                FoodSpot.restaurant.ilike(term),
                FoodSpot.category.ilike(term),
                FoodSpot.area.ilike(term),
                FoodSpot.description.ilike(term),
            )
        )

    foods = [serialize_food(food, campus) for food in db.scalars(query).all()]

    if radius:
        foods = [food for food in foods if (food.distance_m or 0) <= radius]

    if sort == "price":
        foods.sort(key=lambda food: (food.price_min, food.price_max))
    elif sort == "rating":
        foods.sort(key=lambda food: (-food.rating, food.distance_m or 0))
    else:
        foods.sort(key=lambda food: (food.distance_m or 0, -food.rating))

    return foods[: max(1, min(limit, 250))]


def random_food(db: Session, **filters: object) -> FoodSpotResponse | None:
    foods = filter_foods(db, limit=100, **filters)
    return random.choice(foods) if foods else None


def get_food(db: Session, food_id: int, campus: str = "feu_tech") -> FoodSpotResponse | None:
    food = db.get(FoodSpot, food_id)
    if not food or not food.is_active:
        return None
    return serialize_food(food, campus)


def timer_recommendations(
    foods: Sequence[FoodSpotResponse],
    available_minutes: int,
    meal_minutes: int,
) -> list[tuple[FoodSpotResponse, int, int]]:
    picks: list[tuple[FoodSpotResponse, int, int]] = []
    for food in foods:
        round_trip = (food.walking_minutes or 0) * 2
        total = round_trip + meal_minutes
        if total <= available_minutes:
            picks.append((food, round_trip, total))
    return sorted(picks, key=lambda item: (item[2], -item[0].rating))[:12]
