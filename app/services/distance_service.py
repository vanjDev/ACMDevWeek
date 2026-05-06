from math import asin, cos, radians, sin, sqrt

from app.config import get_settings

EARTH_RADIUS_M = 6_371_000


def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    d_lat = radians(lat2 - lat1)
    d_lon = radians(lon2 - lon1)
    r_lat1 = radians(lat1)
    r_lat2 = radians(lat2)

    a = sin(d_lat / 2) ** 2 + cos(r_lat1) * cos(r_lat2) * sin(d_lon / 2) ** 2
    return 2 * EARTH_RADIUS_M * asin(sqrt(a))


def walking_minutes(distance_m: float) -> int:
    speed_m_per_min = get_settings().walking_speed_kmh * 1000 / 60
    return max(1, round(distance_m / speed_m_per_min))


def campus_coordinates(campus: str) -> tuple[float, float]:
    campuses = get_settings().campuses
    selected = campuses.get(campus, campuses["feu_tech"])
    return float(selected["latitude"]), float(selected["longitude"])


def campus_name(campus: str) -> str:
    campuses = get_settings().campuses
    return str(campuses.get(campus, campuses["feu_tech"])["name"])
