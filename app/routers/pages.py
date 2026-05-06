from fastapi import APIRouter, Depends, Request
from fastapi.templating import Jinja2Templates
from fastapi.responses import RedirectResponse

from app.config import get_settings
from app.models import User
from app.services.auth_service import require_admin

templates = Jinja2Templates(directory="app/templates")
router = APIRouter(tags=["pages"])


def context(request: Request, title: str, active_page: str) -> dict[str, object]:
    settings = get_settings()
    return {
        "request": request,
        "title": title,
        "active_page": active_page,
        "app_name": settings.app_name,
        "campuses": settings.campuses,
        "google_client_id": settings.google_client_id,
    }


@router.get("/")
def home(request: Request):
    return templates.TemplateResponse("index.html", context(request, "Find food near FEU", "home"))


@router.get("/tracker")
def tracker(request: Request):
    return templates.TemplateResponse("tracker.html", context(request, "Tracker", "tracker"))


@router.get("/timer")
def timer():
    return RedirectResponse(url="/tracker", status_code=307)


@router.get("/about")
def about(request: Request):
    return templates.TemplateResponse("about.html", context(request, "About", "about"))


@router.get("/admin")
def admin(request: Request, user: User = Depends(require_admin)):
    return templates.TemplateResponse("admin.html", context(request, "Admin", "admin"))
