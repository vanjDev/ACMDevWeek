from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import TimerRecommendation, TimerRequest, TimerResponse
from app.services.distance_service import campus_name
from app.services.food_service import filter_foods, get_food, random_food, timer_recommendations

router = APIRouter(prefix="/api", tags=["api"])


@router.get("/foods")
def list_foods(
    budget_min: int | None = None,
    budget_max: int | None = None,
    category: str | None = None,
    mood: str | None = None,
    area: str | None = None,
    campus: str = "feu_tech",
    radius: int | None = Query(default=1200, ge=100, le=3000),
    sort: str = "distance",
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return filter_foods(db, budget_min, budget_max, category, mood, area, campus, radius, sort, limit)


@router.get("/foods/random")
def pick_random_food(
    budget_min: int | None = None,
    budget_max: int | None = None,
    category: str | None = None,
    mood: str | None = None,
    area: str | None = None,
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
