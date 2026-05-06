from typing import Any

from pydantic import BaseModel, Field


class FoodSpotResponse(BaseModel):
    id: int
    store_id: int | None = None
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


class AdminFoodSpotPayload(BaseModel):
    store_id: int | None = None
    name: str = Field(..., min_length=1, max_length=120)
    restaurant: str = Field(..., min_length=1, max_length=120)
    price_min: int = Field(..., ge=0, le=5000)
    price_max: int = Field(..., ge=0, le=5000)
    category: str = Field(..., min_length=1, max_length=80)
    mood: str = Field(..., min_length=1, max_length=80)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    area: str = Field(..., min_length=1, max_length=100)
    rating: float = Field(default=4.0, ge=0, le=5)
    image_url: str | None = Field(default=None, max_length=500)
    description: str = Field(..., min_length=1)
    is_active: bool = True


class AdminFoodSpotResponse(BaseModel):
    id: int
    store_id: int | None = None
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
    is_active: bool

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
    is_admin: bool = False

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


class StoreRatingPayload(BaseModel):
    store_key: str = Field(..., min_length=1, max_length=140)
    store_name: str = Field(..., min_length=1, max_length=120)
    score: int = Field(..., ge=1, le=5)
    reason: str = Field(..., min_length=1, max_length=240)


class StoreRatingReason(BaseModel):
    score: int
    reason: str
    created_at: str


class StoreRatingSummary(BaseModel):
    average: float
    count: int
    reasons: list[StoreRatingReason] = Field(default_factory=list)
