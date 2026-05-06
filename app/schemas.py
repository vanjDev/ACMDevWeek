from pydantic import BaseModel, Field


class FoodSpotResponse(BaseModel):
    id: int
    name: str
    restaurant: str
    price_min: int
    price_max: int
    category: str
    mood: str
    latitude: float
    longitude: float
    area: str
    rating: float
    image_url: str | None = None
    description: str
    distance_m: float | None = None
    walking_minutes: int | None = None

    model_config = {"from_attributes": True}


class TimerRequest(BaseModel):
    departure_time: str = Field(..., examples=["12:00"])
    arrival_time: str = Field(..., examples=["13:00"])
    campus: str = "feu_tech"
    meal_minutes: int = Field(default=20, ge=5, le=90)
    budget_max: int | None = Field(default=None, ge=1)


class TimerRecommendation(BaseModel):
    food: FoodSpotResponse
    round_trip_minutes: int
    total_needed_minutes: int


class TimerResponse(BaseModel):
    available_minutes: int
    meal_minutes: int
    campus: str
    status: str
    message: str
    recommendations: list[TimerRecommendation]
