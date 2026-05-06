# Saan?

Food decision tool for FEU Tech and FEU Manila students who keep asking, "Saan tayo kakain?"

The app filters nearby food spots by budget, area, food type, mood, radius, and campus. It also includes a Leaflet map, bookmark storage in `localStorage`, a random "Pick for Me" button, and a "Can I Make It?" timer for class-break planning.

## Tech Stack

- FastAPI and Uvicorn
- Jinja2 server-rendered pages
- SQLite with SQLAlchemy
- Vanilla JavaScript and CSS
- Leaflet with OpenStreetMap tiles

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
