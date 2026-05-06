# Saan?

**Saan?** is a student-first food finder for the FEU Morayta area. It helps FEU Tech, FEU Manila, and ENB students answer the daily question: **"Saan tayo kakain?"**

Instead of making students scroll through endless choices, Saan? filters nearby food spots by budget, mood, walking time, campus, food type, and even precise browser location.

## Highlights

- **Smart food discovery** around FEU Tech, FEU Manila, ENB, Morayta, Lerma, and nearby streets.
- **Precise location support** using the browser Geolocation API, so walk times can start from the student's real position.
- **Fallback campus mode** when location permission is denied, using FEU Tech or FEU Manila as the starting point.
- **Restaurant cards with a large side menu**, making food photos, descriptions, prices, and actions easier to view.
- **Separate hearts for restaurants and food items**, so users can save a favorite shop without saving every item inside it.
- **Google Sign-In and guest mode**, with synced saves for logged-in users and local saves for guests.
- **Pick for Me wheel randomizer** that spins through nearby shops and opens the chosen restaurant menu.
- **Campus food map** focused on the FEU area instead of a generic city map.
- **Budget, mood, weather, and time-aware filtering** for real student break decisions.
- **Food history and streak tracking** for simple eating logs.

## Preview

Saan? is designed around a bold FEU-inspired green and cream visual style, with food cards, a custom campus map, a randomizer wheel, and a large restaurant menu panel.

Core screens:

- Home food finder
- Campus-focused map
- Restaurant menu detail panel
- Pick for Me randomizer
- Login and Google Sign-In modal
- Timer/checker for class breaks

## Tech Stack

- **Backend:** FastAPI, Uvicorn
- **Frontend:** Jinja2, vanilla JavaScript, HTML, CSS
- **Database:** SQLite with SQLAlchemy
- **Auth:** Email/password auth plus optional Google Sign-In
- **Location:** Browser Geolocation API
- **Map:** Custom FEU-area visual map
- **Config:** Pydantic Settings and `.env`

## Project Structure

```text
ACMDevWeek/
|-- app/
|   |-- routers/          # FastAPI routes for pages and API endpoints
|   |-- services/         # Food filtering, distance, and auth logic
|   |-- static/
|   |   |-- css/          # Main responsive UI styling
|   |   |-- img/          # Saan logo assets
|   |   `-- js/           # App, auth, map, timer, and picker scripts
|   |-- templates/        # Jinja pages
|   |-- config.py         # App settings
|   |-- database.py       # SQLAlchemy session setup
|   |-- models.py         # Database models
|   |-- schemas.py        # Pydantic schemas
|   `-- seed.py           # Starter FEU food spot data
|-- requirements.txt
|-- .env.example
`-- README.md
```

## Local Setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python -m app.seed
uvicorn app.main:app --reload --port 8042
```

Open:

```text
http://localhost:8042
```

## Environment Variables

Create `.env` from `.env.example`.

```env
APP_NAME=Saan?
DEBUG=True
PORT=8042
DATABASE_URL=sqlite:///./saan.db
SECRET_KEY=change-this-in-production
GOOGLE_CLIENT_ID=
```

`GOOGLE_CLIENT_ID` is optional. If it is empty, the app still works with guest mode and email/password login.

## Google Sign-In

To enable Google Sign-In:

1. Create a Google OAuth Web Client ID in Google Cloud Console.
2. Add your local and production domains to **Authorized JavaScript origins**.
3. Set `GOOGLE_CLIENT_ID` in `.env`.

Example origins:

```text
http://localhost:8042
https://saan.tambytes.com
```

## API Overview

### List food spots

```http
GET /api/foods
```

Useful query params:

```text
campus=feu_tech
budget_max=100
category=chicken
mood=quick_lunch
sort=distance
user_lat=14.6040
user_lng=120.9888
```

Example:

```powershell
curl "http://localhost:8042/api/foods?campus=feu_tech&budget_max=100&sort=distance"
```

With precise location:

```powershell
curl "http://localhost:8042/api/foods?user_lat=14.6040&user_lng=120.9888&sort=distance"
```

### Pick a random food spot

```http
GET /api/foods/random
```

### Read one food item

```http
GET /api/foods/{food_id}
```

### Check if a break is enough

```http
POST /api/timer/check
```

## Deployment Notes

Example VPS service flow:

```bash
cd ~/Saan/ACMDevWeek
git pull
source .venv/bin/activate
pip install -r requirements.txt
python -m app.seed
sudo systemctl restart saan
sudo systemctl status saan
```

The app is commonly run behind Nginx or Cloudflare with Uvicorn bound to localhost:

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8042
```

Browser geolocation requires HTTPS in production, so use the secure domain when testing precise location.

## Data

Starter food data lives in [`app/seed.py`](app/seed.py). Coordinates are focused on the FEU/Morayta area and can be improved as more real food spot data becomes available.

## Why This Exists

Saan? is built for a very specific student problem: deciding where to eat during short breaks around FEU. The goal is not just to list food places, but to make the decision faster, more visual, and more fun.

For FEU students, "Saan?" is the whole question. This app tries to answer it.
