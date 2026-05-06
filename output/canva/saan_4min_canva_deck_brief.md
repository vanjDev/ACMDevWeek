# Saan? 4-Minute Hackathon Presentation - Canva Brief

## Canva Generation Prompt

Create a polished 7-slide hackathon pitch deck for "Saan?", a student-first food finder for FEU Tech, FEU Manila, and nearby Morayta streets. The tone should be energetic, practical, and student-centered. Use a bold FEU-inspired green, warm cream, red accent, and clean editorial layouts. Use food photography, map screenshots, phone/app mockup frames, and concise text. The deck should support a 4-minute live presentation, not replace the speaker.

Audience: hackathon judges, ACM Dev Week reviewers, student technology evaluators.

Core message: Saan? solves the everyday "Saan tayo kakain?" decision for FEU students by combining budget, mood, walking time, precise location, campus context, map routes, food photos, randomizer, bookmarks, ratings, and spending tracker in one focused local web app.

## Slide Plan And Timing

### Slide 1 - Saan?
Goal: Open with the problem in one sentence.
On-slide text:
- Saan?
- FEU food decisions, faster.
- Budget, mood, walk time, campus, and cravings in one student tool.
Visual:
- App hero screenshot or food/map collage.
Speaker notes, 20 seconds:
"Every FEU student knows this question: Saan tayo kakain? The hard part is not finding food in Morayta. The hard part is choosing fast during a short break, with budget, distance, cravings, and friends all involved."

### Slide 2 - The Student Problem
Goal: Make the pain concrete.
On-slide text:
- Too many nearby choices
- Short class breaks
- Budget pressure
- Walking distance matters
- Group decisions take too long
Visual:
- Simple decision funnel or split screen: hungry student plus scattered food options.
Speaker notes, 35 seconds:
"Generic food apps are too broad. Students need campus-aware answers: what is nearby, what is affordable, what fits a 30-minute break, and what works for solo or barkada. Saan? is designed around that exact daily decision."

### Slide 3 - What We Built
Goal: Show the product clearly.
On-slide text:
- Smart FEU-area food finder
- Filters by budget, mood, food type, needs, weather, and time
- Campus fallback or precise browser location
- Store menus with photos, prices, ratings, and walk time
Visual:
- Screenshot of filters and store cards.
Speaker notes, 40 seconds:
"The core experience is a fast food finder. Students can filter by campus, budget, mood, dish, dining style, weather, and available break time. If location permission is allowed, walking estimates start from the student's current position. If not, it falls back to FEU Tech or FEU Manila."

### Slide 4 - Demo Flow
Goal: Give the live demo path.
On-slide text:
1. Pick FEU Tech or FEU Manila
2. Set budget and time available
3. Filter by mood or need
4. Open menu and map route
5. Spin Pick for Me if undecided
Visual:
- Five-step horizontal flow with app screenshots.
Speaker notes, 35 seconds:
"For the demo, we start with a student who has one hour and around PHP 120. We filter for quick or budget-friendly food, open a store menu, inspect the walk time and map, then use Pick for Me to remove decision fatigue."

### Slide 5 - Tech Stack
Goal: Prove implementation depth.
On-slide text:
- Backend: FastAPI, Uvicorn
- Frontend: Jinja2, HTML, CSS, vanilla JavaScript
- Data: SQLite, SQLAlchemy, Pydantic schemas
- Auth: Email/password, signed session cookies, optional Google Sign-In
- Maps: Leaflet, OpenStreetMap/CARTO tiles, OSRM route fallback
- APIs: Weather-aware filters, geolocation, food/random/timer endpoints
Visual:
- Architecture diagram: Browser -> FastAPI routes -> services -> SQLite; Browser -> map/weather/routing APIs.
Speaker notes, 45 seconds:
"The backend is FastAPI with SQLAlchemy and SQLite for rapid local deployment. The frontend is intentionally lightweight: server-rendered Jinja templates plus vanilla JavaScript for interactivity. Services handle filtering, distance, walking estimates, auth, ratings, and timer recommendations."

### Slide 6 - Why It Stands Out
Goal: Connect features to judging criteria.
On-slide text:
- Local-first: built for FEU/Morayta, not generic city search
- Decision-first: filters match real student constraints
- Visual: food photos, campus map, route feedback
- Habit-aware: bookmarks, anti-repeat, spending tracker, streaks
- Deployable: simple FastAPI stack and SQLite seed/import flow
Visual:
- 2x3 feature grid using icons and screenshots.
Speaker notes, 40 seconds:
"The strength is focus. We are not trying to replace big food apps. We are solving one high-frequency student decision with local data, real menus, route context, and a habit layer that remembers what the student ate and spent."

### Slide 7 - Roadmap And Close
Goal: End confidently.
On-slide text:
- Next: live store updates, verified merchant data, better dietary labels
- Next: crowd ratings, campus events, route safety notes
- Ask: help students answer "Saan tayo kakain?" in seconds
Visual:
- Closing app mockup with Saan? logo.
Speaker notes, 25 seconds:
"Next, we would improve verified store data, add crowd signals like queue time and availability, and refine dietary labels. But even today, Saan? already answers the daily FEU question: where should we eat, right now, with the time and budget we actually have?"

## Presenter Cheat Sheet

4-minute pacing:
- Problem: 55 seconds
- Product demo: 75 seconds
- Tech stack and architecture: 55 seconds
- Differentiation and impact: 45 seconds
- Roadmap and close: 30 seconds

Best live demo route:
1. Open `http://localhost:8042`.
2. Show the main filters and result count.
3. Choose `Budget: PHP 50-100` or enter break time around 60 minutes.
4. Click a mood such as `Nagmamadali`, `Tipid`, or `Quick walk`.
5. Open a store menu.
6. Show the map pins and walk time.
7. Click `Pick for Me`, start the wheel, and open the selected menu.
8. Show Tracker briefly as the habit/spending layer.

## Backup One-Liner

"Saan? turns the everyday FEU question 'Saan tayo kakain?' into a quick, campus-aware recommendation based on budget, cravings, walking time, and real student context."
