# Saan?

Saan? is a simple food finder for FEU Tech and FEU Manila students. It helps users decide where to eat around Morayta based on their budget, cravings, mood, distance, and available class break time.

## What The System Does

- Shows nearby food spots around FEU Tech and FEU Manila
- Filters food places by budget, campus, area, category, mood, and distance
- Displays locations on an interactive map
- Lets users bookmark food spots
- Randomly suggests a place through the "Pick for Me" feature
- Checks if a student can make it back on time using the "Can I Make It?" timer
- Supports guest use, email/password accounts, and optional Google sign in

## Tech Stack

- Backend: FastAPI with Uvicorn
- Frontend: Jinja2 templates, vanilla JavaScript, HTML, and CSS
- Database: SQLite with SQLAlchemy
- Map: Leaflet with OpenStreetMap
- Authentication: Email/password login with optional Google Sign-In

## Setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python -m app.seed
uvicorn app.main:app --reload --port 8042
```

Open `http://localhost:8042`.

## Google Sign In

Create a Google OAuth web client ID in Google Cloud Console, add `http://localhost:8042` to its authorized JavaScript origins, then set `GOOGLE_CLIENT_ID` in `.env`.

Google sign in is optional. If `GOOGLE_CLIENT_ID` is empty, email/password login and guest bookmarks still work.

## API

- `GET /api/foods`
- `GET /api/foods/random`
- `GET /api/foods/{id}`
- `POST /api/timer/check`

Example:

```powershell
curl "http://localhost:8042/api/foods?budget_max=100&category=chicken&campus=feu_tech"
```

## Data

Initial data lives in [app/seed.py](app/seed.py). Coordinates are approximate Morayta/FEU-area locations and can be adjusted as better spot data comes in.
