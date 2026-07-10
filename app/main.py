from contextlib import asynccontextmanager
import os
from pathlib import Path
import sys

# Allow running as: python3 app/main.py
if __package__ is None or __package__ == "":
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import init_db
from app.routers import api, pages


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


settings = get_settings()
app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)
static_directory = Path(__file__).resolve().parent / "static"
if static_directory.is_dir():
    app.mount("/static", StaticFiles(directory=static_directory), name="static")
app.include_router(pages.router)
app.include_router(api.router)


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=settings.debug)
