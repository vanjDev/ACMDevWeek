from datetime import datetime, timedelta
from pathlib import Path
import re
import secrets

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import FoodRating, FoodSpot, SavedFood, Store, StoreRating, User, UserPreference
from app.schemas import (
    AdminFoodSpotPayload,
    AdminFoodSpotResponse,
    AdminStoreResponse,
    AuthRequest,
    AuthResponse,
    BookmarkPayload,
    FoodRatingPayload,
    GoogleAuthRequest,
    PublicConfigResponse,
    StoreRatingPayload,
    StoreRatingSummary,
    TimerRecommendation,
    TimerRequest,
    TimerResponse,
    UserDataPayload,
    UserResponse,
)
from app.services.auth_service import (
    clear_session_cookie,
    hash_password,
    is_admin_user,
    normalize_email,
    require_admin,
    require_user,
    set_session_cookie,
    verify_password,
    verify_google_id_token,
)
from app.services.distance_service import campus_name
from app.services.food_service import filter_foods, get_food, random_food, timer_recommendations

router = APIRouter(prefix="/api", tags=["api"])

UPLOAD_ROOT = Path("app/static/uploads/foods")
ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
MAX_IMAGE_BYTES = 5 * 1024 * 1024


def user_response(user: User) -> UserResponse:
    return UserResponse(id=user.id, name=user.name, email=user.email, is_admin=is_admin_user(user))


def admin_food_response(food: FoodSpot) -> AdminFoodSpotResponse:
    response = AdminFoodSpotResponse.model_validate(food)
    if food.store:
        response.opens_at = food.store.opens_at
        response.closes_at = food.store.closes_at
    return response


def admin_store_response(store: Store) -> AdminStoreResponse:
    return AdminStoreResponse.model_validate(store)


def safe_upload_stem(filename: str) -> str:
    stem = Path(filename or "food-image").stem.lower()
    stem = re.sub(r"[^a-z0-9]+", "-", stem).strip("-")
    return stem[:48] or "food-image"


def validate_time_value(value: str, field_name: str) -> str:
    if not re.match(r"^\d{2}:\d{2}$", value or ""):
        raise HTTPException(status_code=422, detail=f"{field_name} must use HH:MM format.")
    hour, minute = [int(part) for part in value.split(":", 1)]
    if hour > 23 or minute > 59:
        raise HTTPException(status_code=422, detail=f"{field_name} must be a valid time.")
    return value


def get_or_create_store(db: Session, payload: AdminFoodSpotPayload) -> Store:
    store = db.get(Store, payload.store_id) if payload.store_id else None
    name = payload.restaurant.strip()
    existing = db.query(Store).filter(Store.name == name).first()
    if existing and (not store or existing.id != store.id):
        store = existing
    if not store:
        store = Store(name=name)
        db.add(store)

    store.name = name
    store.latitude = payload.latitude
    store.longitude = payload.longitude
    store.area = payload.area.strip()
    if payload.image_url or not payload.store_id:
        store.image_url = payload.image_url.strip() if payload.image_url else None
    store.opens_at = validate_time_value(payload.opens_at, "Opens")
    store.closes_at = validate_time_value(payload.closes_at, "Closes")
    store.is_active = payload.is_active
    return store


def apply_food_payload(db: Session, food: FoodSpot, payload: AdminFoodSpotPayload) -> FoodSpot:
    if payload.price_max < payload.price_min:
        raise HTTPException(status_code=422, detail="Max price must be greater than or equal to min price.")

    store = get_or_create_store(db, payload)
    food.store = store
    food.name = payload.name.strip()
    food.restaurant = store.name
    food.price_min = payload.price_min
    food.price_max = payload.price_max
    food.category = payload.category.strip()
    food.mood = payload.mood.strip()
    food.latitude = store.latitude
    food.longitude = store.longitude
    food.area = store.area
    food.image_url = payload.image_url.strip() if payload.image_url else None
    food.description = payload.description.strip()
    food.is_active = payload.is_active
    return food


@router.get("/config", response_model=PublicConfigResponse)
def public_config():
    settings = get_settings()
    client_id = settings.google_client_id.strip()
    return PublicConfigResponse(google_client_id=client_id, google_enabled=bool(client_id))


@router.get("/store-ratings", response_model=dict[str, StoreRatingSummary])
def list_store_ratings(db: Session = Depends(get_db)):
    rows = db.query(StoreRating).order_by(StoreRating.created_at.desc()).limit(500).all()
    grouped: dict[str, list[StoreRating]] = {}
    for row in rows:
        grouped.setdefault(row.store_key, []).append(row)

    summaries = {}
    for store_key, ratings in grouped.items():
        average = round(sum(row.score for row in ratings) / len(ratings), 1)
        summaries[store_key] = {
            "average": average,
            "count": len(ratings),
            "reasons": [
                {
                    "score": row.score,
                    "reason": row.reason,
                    "created_at": row.created_at.isoformat(),
                }
                for row in ratings[:3]
            ],
        }
    return summaries


@router.post("/store-ratings", response_model=StoreRatingSummary)
def create_store_rating(payload: StoreRatingPayload, db: Session = Depends(get_db)):
    reason = payload.reason.strip()
    if not reason:
        raise HTTPException(status_code=422, detail="Rating reason is required.")

    rating = StoreRating(
        store_key=payload.store_key.strip(),
        store_name=payload.store_name.strip(),
        score=payload.score,
        reason=reason,
    )
    db.add(rating)
    db.commit()
    rows = db.query(StoreRating).filter(StoreRating.store_key == rating.store_key).order_by(StoreRating.created_at.desc()).all()
    average = round(sum(row.score for row in rows) / len(rows), 1)
    return {
        "average": average,
        "count": len(rows),
        "reasons": [
            {
                "score": row.score,
                "reason": row.reason,
                "created_at": row.created_at.isoformat(),
            }
            for row in rows[:3]
        ],
    }


@router.get("/food-ratings", response_model=dict[int, StoreRatingSummary])
def list_food_ratings(db: Session = Depends(get_db)):
    rows = db.query(FoodRating).order_by(FoodRating.created_at.desc()).limit(500).all()
    grouped: dict[int, list[FoodRating]] = {}
    for row in rows:
        grouped.setdefault(row.food_id, []).append(row)

    summaries = {}
    for food_id, ratings in grouped.items():
        average = round(sum(row.score for row in ratings) / len(ratings), 1)
        summaries[food_id] = {
            "average": average,
            "count": len(ratings),
            "reasons": [
                {
                    "score": row.score,
                    "reason": row.reason,
                    "created_at": row.created_at.isoformat(),
                }
                for row in ratings[:3]
            ],
        }
    return summaries


@router.post("/food-ratings", response_model=StoreRatingSummary)
def create_food_rating(payload: FoodRatingPayload, db: Session = Depends(get_db)):
    reason = payload.reason.strip()
    if not reason:
        raise HTTPException(status_code=422, detail="Rating reason is required.")

    rating = FoodRating(
        food_id=payload.food_id,
        food_name=payload.food_name.strip(),
        restaurant=payload.restaurant.strip(),
        score=payload.score,
        reason=reason,
    )
    db.add(rating)
    db.commit()
    rows = db.query(FoodRating).filter(FoodRating.food_id == rating.food_id).order_by(FoodRating.created_at.desc()).all()
    average = round(sum(row.score for row in rows) / len(rows), 1)
    return {
        "average": average,
        "count": len(rows),
        "reasons": [
            {
                "score": row.score,
                "reason": row.reason,
                "created_at": row.created_at.isoformat(),
            }
            for row in rows[:3]
        ],
    }


@router.post("/auth/register", response_model=AuthResponse)
def register(payload: AuthRequest, response: Response, db: Session = Depends(get_db)):
    email = normalize_email(payload.email)
    if not payload.name or not payload.name.strip():
        raise HTTPException(status_code=422, detail="Name is required.")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="Email is already registered.")

    user = User(name=payload.name.strip(), email=email, password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    set_session_cookie(response, user.id)
    return AuthResponse(user=user_response(user))


@router.post("/auth/login", response_model=AuthResponse)
def login(payload: AuthRequest, response: Response, db: Session = Depends(get_db)):
    email = normalize_email(payload.email)
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    set_session_cookie(response, user.id)
    return AuthResponse(user=user_response(user))


@router.post("/auth/google", response_model=AuthResponse)
def google_login(payload: GoogleAuthRequest, response: Response, db: Session = Depends(get_db)):
    profile = verify_google_id_token(payload.credential)
    google_sub = str(profile["sub"])
    email = normalize_email(str(profile["email"]))
    name = str(profile.get("name") or email.split("@", 1)[0])

    user = db.query(User).filter(User.google_sub == google_sub).first()
    if not user:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.google_sub = google_sub
            if user.name == user.email:
                user.name = name
        else:
            user = User(
                name=name,
                email=email,
                google_sub=google_sub,
                password_hash=hash_password(secrets.token_urlsafe(32)),
            )
            db.add(user)

    db.commit()
    db.refresh(user)
    set_session_cookie(response, user.id)
    return AuthResponse(user=user_response(user))


@router.post("/auth/logout")
def logout(response: Response):
    clear_session_cookie(response)
    return {"ok": True}


@router.get("/auth/me")
def read_current_user(user: User | None = Depends(require_user)):
    return {"user": user_response(user)}


@router.get("/me/bookmarks")
def read_bookmarks(user: User = Depends(require_user), db: Session = Depends(get_db)):
    rows = db.query(SavedFood.food_id).filter(SavedFood.user_id == user.id).all()
    return {"food_ids": [row[0] for row in rows]}


@router.put("/me/bookmarks")
def save_bookmarks(payload: BookmarkPayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    food_ids = sorted(set(payload.food_ids))
    valid_ids = {
        row[0]
        for row in db.query(FoodSpot.id)
        .filter(FoodSpot.id.in_(food_ids), FoodSpot.is_active.is_(True))
        .all()
    }

    db.query(SavedFood).filter(SavedFood.user_id == user.id).delete()
    for food_id in food_ids:
        if food_id in valid_ids:
            db.add(SavedFood(user_id=user.id, food_id=food_id))
    db.commit()
    return {"food_ids": [food_id for food_id in food_ids if food_id in valid_ids]}


@router.get("/me/data")
def read_user_data(user: User = Depends(require_user), db: Session = Depends(get_db)):
    preference = db.query(UserPreference).filter(UserPreference.user_id == user.id).first()
    return {"data": preference.data if preference else {}}


@router.put("/me/data")
def save_user_data(payload: UserDataPayload, user: User = Depends(require_user), db: Session = Depends(get_db)):
    preference = db.query(UserPreference).filter(UserPreference.user_id == user.id).first()
    if preference:
        preference.data = payload.data
    else:
        preference = UserPreference(user_id=user.id, data=payload.data)
        db.add(preference)
    db.commit()
    return {"data": preference.data}


@router.get("/admin/foods", response_model=list[AdminFoodSpotResponse])
def admin_list_foods(
    q: str | None = None,
    include_inactive: bool = True,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(FoodSpot)
    if not include_inactive:
        query = query.filter(FoodSpot.is_active.is_(True))
    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.filter((FoodSpot.name.ilike(term)) | (FoodSpot.restaurant.ilike(term)))
    rows = query.order_by(FoodSpot.restaurant.asc(), FoodSpot.name.asc()).limit(250).all()
    return [admin_food_response(row) for row in rows]


@router.get("/admin/stores", response_model=list[AdminStoreResponse])
def admin_list_stores(
    include_inactive: bool = Query(default=True),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    query = db.query(Store)
    if not include_inactive:
        query = query.filter(Store.is_active.is_(True))
    rows = query.order_by(Store.name.asc()).all()
    return [admin_store_response(row) for row in rows]


@router.post("/admin/uploads/image")
async def admin_upload_image(
    image: UploadFile = File(...),
    admin: User = Depends(require_admin),
):
    extension = ALLOWED_IMAGE_TYPES.get(image.content_type or "")
    if not extension:
        raise HTTPException(status_code=422, detail="Upload a JPG, PNG, WEBP, or GIF image.")

    data = await image.read()
    if not data:
        raise HTTPException(status_code=422, detail="Image file is empty.")
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image must be 5 MB or smaller.")

    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    filename = f"{safe_upload_stem(image.filename)}-{secrets.token_hex(6)}{extension}"
    path = UPLOAD_ROOT / filename
    path.write_bytes(data)
    return {"image_url": f"/static/uploads/foods/{filename}", "filename": filename}


@router.post("/admin/foods", response_model=AdminFoodSpotResponse)
def admin_create_food(
    payload: AdminFoodSpotPayload,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    food = apply_food_payload(db, FoodSpot(), payload)
    db.add(food)
    db.commit()
    db.refresh(food)
    return admin_food_response(food)


@router.put("/admin/foods/{food_id}", response_model=AdminFoodSpotResponse)
def admin_update_food(
    food_id: int,
    payload: AdminFoodSpotPayload,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    food = db.get(FoodSpot, food_id)
    if not food:
        raise HTTPException(status_code=404, detail="Food spot not found.")
    apply_food_payload(db, food, payload)
    db.commit()
    db.refresh(food)
    return admin_food_response(food)


@router.delete("/admin/foods/{food_id}")
def admin_disable_food(
    food_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    food = db.get(FoodSpot, food_id)
    if not food:
        raise HTTPException(status_code=404, detail="Food spot not found.")
    food.is_active = False
    db.commit()
    return {"ok": True}


@router.get("/foods")
def list_foods(
    budget_min: int | None = None,
    budget_max: int | None = None,
    category: str | None = None,
    mood: str | None = None,
    dish: str | None = None,
    dining: str | None = None,
    weather: str | None = None,
    feature: str | None = None,
    time_max: int | None = Query(default=None, ge=10, le=180),
    meal_minutes: int = Query(default=20, ge=5, le=90),
    avoid_ids: str | None = None,
    area: str | None = None,
    q: str | None = None,
    campus: str = "feu_tech",
    radius: int | None = Query(default=1200, ge=100, le=3000),
    sort: str = "distance",
    limit: int = Query(default=100, ge=1, le=250),
    user_lat: float | None = Query(default=None, ge=-90, le=90),
    user_lng: float | None = Query(default=None, ge=-180, le=180),
    db: Session = Depends(get_db),
):
    return filter_foods(
        db,
        budget_min,
        budget_max,
        category,
        mood,
        area,
        q,
        dish,
        dining,
        weather,
        avoid_ids,
        campus,
        radius,
        sort,
        limit,
        feature,
        time_max,
        meal_minutes,
        user_lat,
        user_lng,
    )


@router.get("/foods/random")
def pick_random_food(
    budget_min: int | None = None,
    budget_max: int | None = None,
    category: str | None = None,
    mood: str | None = None,
    dish: str | None = None,
    dining: str | None = None,
    weather: str | None = None,
    feature: str | None = None,
    time_max: int | None = Query(default=None, ge=10, le=180),
    meal_minutes: int = Query(default=20, ge=5, le=90),
    avoid_ids: str | None = None,
    area: str | None = None,
    q: str | None = None,
    campus: str = "feu_tech",
    radius: int | None = Query(default=1200, ge=100, le=3000),
    sort: str = "distance",
    user_lat: float | None = Query(default=None, ge=-90, le=90),
    user_lng: float | None = Query(default=None, ge=-180, le=180),
    db: Session = Depends(get_db),
):
    food = random_food(
        db,
        budget_min=budget_min,
        budget_max=budget_max,
        category=category,
        mood=mood,
        dish=dish,
        dining=dining,
        weather=weather,
        feature=feature,
        time_max=time_max,
        meal_minutes=meal_minutes,
        avoid_ids=avoid_ids,
        area=area,
        q=q,
        campus=campus,
        radius=radius,
        sort=sort,
        user_lat=user_lat,
        user_lng=user_lng,
    )
    if not food:
        raise HTTPException(status_code=404, detail="No matching food spots found.")
    return food


@router.get("/foods/{food_id}")
def read_food(
    food_id: int,
    campus: str = "feu_tech",
    user_lat: float | None = Query(default=None, ge=-90, le=90),
    user_lng: float | None = Query(default=None, ge=-180, le=180),
    db: Session = Depends(get_db),
):
    food = get_food(db, food_id, campus, user_lat, user_lng)
    if not food:
        raise HTTPException(status_code=404, detail="Food spot not found.")
    return food


@router.post("/timer/check", response_model=TimerResponse)
def check_timer(payload: TimerRequest, db: Session = Depends(get_db)):
    try:
        departure = datetime.strptime(payload.departure_time, "%H:%M")
        arrival = datetime.strptime(payload.arrival_time, "%H:%M")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Use HH:MM time format.") from exc

    if arrival <= departure:
        arrival += timedelta(days=1)

    available = max(0, round((arrival - departure).total_seconds() / 60))
    foods = filter_foods(
        db,
        budget_max=payload.budget_max,
        campus=payload.campus,
        radius=1800,
        sort="distance",
        limit=100,
    )
    picks = timer_recommendations(foods, available, payload.meal_minutes)

    if available < 15:
        status = "red"
        message = "Just grab from the canteen."
    elif picks and available >= 35:
        status = "green"
        message = "Go for it."
    elif picks:
        status = "yellow"
        message = "Tight but doable."
    else:
        status = "red"
        message = "No nearby picks fit this window."

    return TimerResponse(
        available_minutes=available,
        meal_minutes=payload.meal_minutes,
        campus=campus_name(payload.campus),
        status=status,
        message=message,
        recommendations=[
            TimerRecommendation(food=food, round_trip_minutes=round_trip, total_needed_minutes=total)
            for food, round_trip, total in picks
        ],
    )
