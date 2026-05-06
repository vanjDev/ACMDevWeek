from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates

from app.config import get_settings

templates = Jinja2Templates(directory="app/templates")
router = APIRouter(tags=["pages"])


def context(request: Request, title: str) -> dict[str, object]:
    settings = get_settings()
    return {
        "request": request,
        "title": title,
        "app_name": settings.app_name,
        "campuses": settings.campuses,
        "google_client_id": settings.google_client_id,
    }


@router.get("/")
def home(request: Request):
    return templates.TemplateResponse("index.html", context(request, "Find food near FEU"))


@router.get("/timer")
def timer(request: Request):
    return templates.TemplateResponse("timer.html", context(request, "Can I Make It?"))


@router.get("/about")
def about(request: Request):
    return templates.TemplateResponse("about.html", context(request, "About"))
