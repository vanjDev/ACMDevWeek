from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import FoodSpot, SavedFood, User
from app.schemas import AuthRequest, AuthResponse, BookmarkPayload, TimerRecommendation, TimerRequest, TimerResponse, UserResponse
from app.services.auth_service import (
    clear_session_cookie,
    hash_password,
    normalize_email,
    require_user,
    set_session_cookie,
    verify_password,
)
from app.services.distance_service import campus_name
from app.services.food_service import filter_foods, get_food, random_food, timer_recommendations

router = APIRouter(prefix="/api", tags=["api"])


def user_response(user: User) -> UserResponse:
    return UserResponse(id=user.id, name=user.name, email=user.email)


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


@router.get("/foods")
def list_foods(
    budget_min: int | None = None,
    budget_max: int | None = None,
    category: str | None = None,
    mood: str | None = None,
    area: str | None = None,
    q: str | None = None,
    campus: str = "feu_tech",
    radius: int | None = Query(default=1200, ge=100, le=3000),
    sort: str = "distance",
    limit: int = Query(default=100, ge=1, le=250),
    db: Session = Depends(get_db),
):
    return filter_foods(db, budget_min, budget_max, category, mood, area, q, campus, radius, sort, limit)


@router.get("/foods/random")
def pick_random_food(
    budget_min: int | None = None,
    budget_max: int | None = None,
    category: str | None = None,
    mood: str | None = None,
    area: str | None = None,
    q: str | None = None,
    campus: str = "feu_tech",
    radius: int | None = Query(default=1200, ge=100, le=3000),
    sort: str = "distance",
    db: Session = Depends(get_db),
):
    food = random_food(
        db,
        budget_min=budget_min,
        budget_max=budget_max,
        category=category,
        mood=mood,
        area=area,
        q=q,
        campus=campus,
        radius=radius,
        sort=sort,
    )
    if not food:
        raise HTTPException(status_code=404, detail="No matching food spots found.")
    return food


@router.get("/foods/{food_id}")
def read_food(food_id: int, campus: str = "feu_tech", db: Session = Depends(get_db)):
    food = get_food(db, food_id, campus)
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
