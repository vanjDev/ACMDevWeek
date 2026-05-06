from typing import Any

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
    diet_tags: list[str] = Field(default_factory=list)
    frames: list[str] = Field(default_factory=list)
    weather_tags: list[str] = Field(default_factory=list)
    feature_tags: list[str] = Field(default_factory=list)
    shareable: bool = False

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


class AuthRequest(BaseModel):
    email: str
    password: str = Field(..., min_length=6)
    name: str | None = None


class UserResponse(BaseModel):
    id: int
    name: str
    email: str

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    user: UserResponse


class GoogleAuthRequest(BaseModel):
    credential: str


class PublicConfigResponse(BaseModel):
    google_client_id: str = ""
    google_enabled: bool = False


class BookmarkPayload(BaseModel):
    food_ids: list[int] = Field(default_factory=list)


class UserDataPayload(BaseModel):
    data: dict[str, Any] = Field(default_factory=dict)
