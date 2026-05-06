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


PORK_TERMS = ("pork", "sisig", "bacon", "bacsilog", "longsilog")
BEEF_TERMS = ("beef", "pares", "tapa", "tapsilog", "burger steak", "shawarma")
HOT_WEATHER_TERMS = ("iced", "milk tea", "soda", "fruit", "fries", "takoyaki", "corn dog")
RAINY_WEATHER_TERMS = ("mami", "pares", "coffee", "americano", "rice", "lugaw", "noodles", "canton")
SHAREABLE_TERMS = ("unli", "wings", "nachos", "takoyaki", "fries", "balls")
AIRCON_TERMS = ("canteen", "coffee", "cafe", "milk tea", "mcdonald", "jollibee")
STUDY_TERMS = ("coffee", "cafe", "study", "quiet", "drinks")
OPEN_LATE_TERMS = ("late", "24", "mcdonald", "jollibee", "pares", "street")


def _haystack(food: FoodSpot | FoodSpotResponse) -> str:
    return " ".join(
        [
            food.name,
            food.restaurant,
            food.category,
            food.mood,
            food.area,
            food.description,
        ]
    ).lower()


def _matches_any(food: FoodSpot | FoodSpotResponse, terms: tuple[str, ...]) -> bool:
    text = _haystack(food)
    return any(term in text for term in terms)


def _dish_matches(food: FoodSpotResponse, dishes: list[str]) -> bool:
    if not dishes:
        return True
    checks = {
        "pork": _matches_any(food, PORK_TERMS),
        "beef": _matches_any(food, BEEF_TERMS),
        "chicken": food.category == "chicken" or "chicken" in _haystack(food),
        "snacks": food.category in {"snacks", "street_food", "dimsum", "coffee_drinks", "burgers"},
        "halal": "pork" not in food.diet_tags,
    }
    return any(checks.get(dish, False) for dish in dishes)


def _weather_matches(food: FoodSpotResponse, weather: str | None) -> bool:
    if not weather or weather in {"auto", "any"}:
        return True
    if weather == "hot":
        return "hot_day" in food.weather_tags or food.category in {"coffee_drinks", "snacks"}
    if weather in {"rainy", "cool"}:
        return "rainy_day" in food.weather_tags or food.category in {"rice_meals", "coffee_drinks"}
    return True


def _dining_matches(food: FoodSpotResponse, dining: str | None) -> bool:
    if dining == "solo":
        return not (food.shareable and food.price_min >= 130)
    if dining == "barkada":
        return food.shareable or food.mood in {"group_meal", "chill_hangout"}
    return True


def _feature_matches(food: FoodSpotResponse, features: list[str]) -> bool:
    if not features:
        return True
    tags = set(food.feature_tags)
    return all(feature in tags for feature in features)


def serialize_food(food: FoodSpot, campus: str = "feu_tech") -> FoodSpotResponse:
    lat, lng = campus_coordinates(campus)
    distance = haversine_meters(lat, lng, food.latitude, food.longitude)
    data = FoodSpotResponse.model_validate(food)
    data.distance_m = round(distance, 1)
    data.walking_minutes = walking_minutes(distance)
    text = _haystack(food)

    diet_tags: list[str] = []
    if _matches_any(food, PORK_TERMS):
        diet_tags.append("pork")
    if _matches_any(food, BEEF_TERMS):
        diet_tags.append("beef")
    if food.category == "chicken" or "chicken" in text:
        diet_tags.append("chicken")
    if "pork" not in diet_tags:
        diet_tags.append("halal_friendly")
    data.diet_tags = diet_tags

    frames: list[str] = []
    if food.rating >= 4.4 or food.area == "inside_campus":
        frames.append("Safe choice")
    if food.price_max <= 80:
        frames.append("Budget-friendly")
    if food.mood == "quick_lunch" or (data.walking_minutes or 0) <= 4:
        frames.append("Quick bite")
    if food.mood == "group_meal" or _matches_any(food, SHAREABLE_TERMS):
        frames.append("Barkada pick")
    if food.rating >= 4.4 and food.price_min >= 120:
        frames.append("Treat myself")
    if food.category in {"street_food", "dimsum"}:
        frames.append("Adventurous")
    if "halal_friendly" in diet_tags:
        frames.append("Halal-friendly")
    data.frames = frames[:4]

    weather_tags: list[str] = []
    if food.category == "coffee_drinks" or _matches_any(food, HOT_WEATHER_TERMS):
        weather_tags.append("hot_day")
    if _matches_any(food, RAINY_WEATHER_TERMS):
        weather_tags.append("rainy_day")
    data.weather_tags = weather_tags
    data.shareable = food.mood == "group_meal" or _matches_any(food, SHAREABLE_TERMS)

    feature_tags: list[str] = []
    if data.walking_minutes is not None and data.walking_minutes <= 5:
        feature_tags.append("quick")
    if food.price_max <= 100:
        feature_tags.append("budget")
    if data.shareable or food.mood in {"group_meal", "chill_hangout"}:
        feature_tags.append("group")
    if food.mood == "study_fuel" or _matches_any(food, STUDY_TERMS):
        feature_tags.append("study")
    if food.area == "inside_campus" or _matches_any(food, AIRCON_TERMS):
        feature_tags.append("aircon")
    if food.mood == "late_night" or _matches_any(food, OPEN_LATE_TERMS):
        feature_tags.append("open_late")
    data.feature_tags = feature_tags
    return data


def filter_foods(
    db: Session,
    budget_min: int | None = None,
    budget_max: int | None = None,
    category: str | None = None,
    mood: str | None = None,
    area: str | None = None,
    q: str | None = None,
    dish: str | None = None,
    dining: str | None = None,
    weather: str | None = None,
    avoid_ids: str | None = None,
    campus: str = "feu_tech",
    radius: int | None = None,
    sort: str = "distance",
    limit: int = 50,
    feature: str | None = None,
    time_max: int | None = None,
    meal_minutes: int = 20,
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

    avoid = {int(item) for item in _split_csv(avoid_ids) if item.isdigit()}
    if avoid:
        foods = [food for food in foods if food.id not in avoid]

    dishes = _split_csv(dish)
    if dishes:
        foods = [food for food in foods if _dish_matches(food, dishes)]

    if dining:
        foods = [food for food in foods if _dining_matches(food, dining)]

    if weather:
        foods = [food for food in foods if _weather_matches(food, weather)]

    features = _split_csv(feature)
    if features:
        foods = [food for food in foods if _feature_matches(food, features)]

    if time_max:
        foods = [
            food
            for food in foods
            if ((food.walking_minutes or 0) * 2 + meal_minutes) <= time_max
        ]

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
