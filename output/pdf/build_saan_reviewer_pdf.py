from __future__ import annotations

import sqlite3
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output" / "pdf" / "saan_hackathon_reviewer.pdf"
DB = ROOT / "saan.db"


def db_counts() -> dict[str, object]:
    data: dict[str, object] = {
        "stores": 0,
        "foods": 0,
        "areas": [],
        "categories": [],
        "price": (0, 0, 0, 0),
    }
    if not DB.exists():
        return data

    with sqlite3.connect(DB) as conn:
        cur = conn.cursor()
        data["stores"] = cur.execute("SELECT COUNT(*) FROM stores").fetchone()[0]
        data["foods"] = cur.execute("SELECT COUNT(*) FROM food_spots").fetchone()[0]
        data["areas"] = cur.execute(
            "SELECT area, COUNT(*) FROM food_spots GROUP BY area ORDER BY COUNT(*) DESC"
        ).fetchall()
        data["categories"] = cur.execute(
            "SELECT category, COUNT(*) FROM food_spots GROUP BY category ORDER BY COUNT(*) DESC"
        ).fetchall()
        data["price"] = cur.execute(
            "SELECT MIN(price_min), MAX(price_max), ROUND(AVG(price_min), 1), ROUND(AVG(price_max), 1) FROM food_spots"
        ).fetchone()
    return data


def area_label(value: str) -> str:
    return value.replace("_", " ").title()


def bullet_list(items: list[str], style: ParagraphStyle) -> ListFlowable:
    return ListFlowable(
        [ListItem(Paragraph(item, style), leftIndent=12) for item in items],
        bulletType="bullet",
        start="circle",
        leftIndent=16,
    )


def section(title: str, body: list[object]) -> KeepTogether:
    return KeepTogether([Paragraph(title, STYLES["SectionTitle"]), Spacer(1, 6), *body, Spacer(1, 12)])


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#64736d"))
    canvas.drawString(doc.leftMargin, 0.42 * inch, "Saan? Hackathon Reviewer")
    canvas.drawRightString(A4[0] - doc.rightMargin, 0.42 * inch, f"Page {doc.page}")
    canvas.restoreState()


styles = getSampleStyleSheet()
STYLES = {
    "Title": ParagraphStyle(
        "Title",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=28,
        leading=32,
        textColor=colors.HexColor("#00583f"),
        alignment=TA_CENTER,
        spaceAfter=10,
    ),
    "Subtitle": ParagraphStyle(
        "Subtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=11,
        leading=16,
        textColor=colors.HexColor("#2f403a"),
        alignment=TA_CENTER,
        spaceAfter=20,
    ),
    "SectionTitle": ParagraphStyle(
        "SectionTitle",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=18,
        textColor=colors.HexColor("#00583f"),
        spaceBefore=4,
        spaceAfter=4,
    ),
    "Body": ParagraphStyle(
        "Body",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9.6,
        leading=13.5,
        textColor=colors.HexColor("#26332f"),
        spaceAfter=6,
    ),
    "Small": ParagraphStyle(
        "Small",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8.6,
        leading=12,
        textColor=colors.HexColor("#26332f"),
    ),
    "Question": ParagraphStyle(
        "Question",
        parent=styles["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=9.4,
        leading=12.8,
        textColor=colors.HexColor("#17352b"),
        spaceBefore=4,
    ),
}


def build_pdf() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    counts = db_counts()
    price_min, price_max, avg_min, avg_max = counts["price"]

    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=A4,
        rightMargin=0.58 * inch,
        leftMargin=0.58 * inch,
        topMargin=0.58 * inch,
        bottomMargin=0.65 * inch,
        title="Saan? Hackathon Reviewer",
        author="Saan? Team",
    )

    story: list[object] = []
    story.append(Paragraph("Saan?", STYLES["Title"]))
    story.append(
        Paragraph(
            "Hackathon reviewer packet for a student-first food finder around FEU Tech, FEU Manila, and Morayta. Prepared May 7, 2026.",
            STYLES["Subtitle"],
        )
    )

    stats = [
        ["Dataset", f"{counts['stores']} stores", f"{counts['foods']} food items"],
        ["Price range", f"PHP {price_min} to PHP {price_max}", f"Average PHP {avg_min}-{avg_max}"],
        ["Core users", "FEU Tech, FEU Manila, ENB students", "Short breaks, budget choices"],
        ["Live URL", "http://localhost:8042", "FastAPI local server"],
    ]
    table = Table(stats, colWidths=[1.25 * inch, 2.2 * inch, 2.75 * inch])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e6f4ed")),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#20332e")),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8.8),
                ("LEADING", (0, 0), (-1, -1), 11),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#bdd7cc")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(table)
    story.append(Spacer(1, 14))

    story.append(
        section(
            "1. Executive Summary",
            [
                Paragraph(
                    "Saan? answers the everyday student question: Where should we eat right now? It is not a generic restaurant directory. It is a campus-aware decision tool that weighs budget, food type, mood, walking time, current campus, optional precise location, weather, break length, and personal history.",
                    STYLES["Body"],
                ),
                bullet_list(
                    [
                        "Problem: FEU students have many nearby food options but limited time and budget.",
                        "Solution: A focused food finder with filters, route-aware map, menu details, Pick for Me randomizer, bookmarks, reviews, and budget tracker.",
                        "Impact: Students can choose faster, avoid repeat decisions, and understand whether a meal fits their class break and weekly spending.",
                    ],
                    STYLES["Body"],
                ),
            ],
        )
    )

    story.append(
        section(
            "2. Product Review",
            [
                bullet_list(
                    [
                        "Home food finder: filters by campus, budget, area, food type, preferred dish, mood, dining style, needs, weather, and time available.",
                        "Precise location: browser Geolocation API can replace campus coordinates for walking estimates. If denied, campus fallback keeps the app usable.",
                        "Campus map: Leaflet map with FEU Tech, FEU Manila, ENB, store pins, selected-shop panel, and route display with local pedestrian fallback plus OSRM routing.",
                        "Restaurant menus: each store groups menu items, photos, prices, hours, ratings, bookmarks, and meal logging actions.",
                        "Pick for Me: wheel randomizer uses current filters and opens the chosen store menu.",
                        "Tracker: logs meals in Manila time, tracks streak, today spend, weekly spend, weekly budget, and tipid advice.",
                        "Reviews: logged-in users can rate stores and food. Re-rating updates the previous score instead of creating duplicates, and public reviews show masked names plus FEU affiliation tags.",
                    ],
                    STYLES["Body"],
                )
            ],
        )
    )

    stack_rows = [
        ["Layer", "Technology", "Why it fits"],
        ["Backend", "FastAPI, Uvicorn", "Quick API development, automatic validation, simple local deployment."],
        ["Frontend", "Jinja2, HTML, CSS, vanilla JS", "Lightweight and hackathon-friendly without a heavy build step."],
        ["Database", "SQLite, SQLAlchemy", "Portable local data store with clear models and easy seed/import flow."],
        ["Schemas", "Pydantic", "Input validation for filters, auth, admin data, ratings, and timer checks."],
        ["Auth", "Signed cookies, PBKDF2 password hashing, optional Google Sign-In", "Supports guest use, accounts, and admin-only actions."],
        ["Map", "Leaflet, OpenStreetMap/CARTO, OSRM", "Campus map, store pins, walking route context."],
        ["Browser APIs", "Geolocation, LocalStorage, SessionStorage", "Precise location, guest saves, meal history, preferences."],
    ]
    stack_table = Table(stack_rows, colWidths=[1.05 * inch, 1.75 * inch, 3.4 * inch], repeatRows=1)
    stack_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#00583f")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 8.3),
                ("LEADING", (0, 0), (-1, -1), 10.5),
                ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#c9d8d2")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f4faf7")]),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(section("3. Tech Stack", [stack_table]))

    story.append(PageBreak())
    story.append(
        section(
            "4. Architecture",
            [
                Paragraph(
                    "Request flow: Browser UI sends filter, auth, rating, bookmark, and tracker actions to FastAPI routes. Routes validate payloads with Pydantic, use services for food filtering, distance estimates, auth, and timer logic, then persist or read data through SQLAlchemy models in SQLite.",
                    STYLES["Body"],
                ),
                bullet_list(
                    [
                        "Routes: `app/routers/pages.py` serves Jinja pages; `app/routers/api.py` serves JSON endpoints.",
                        "Services: `food_service.py` handles filtering, serialization, derived tags, random picks, and timer recommendations.",
                        "Distance: `distance_service.py` uses haversine distance and configurable walking speed.",
                        "Auth: `auth_service.py` handles password hashing, signed cookies, optional Google ID token verification, and admin checks.",
                        "Data import: `import_data_bundle.py` imports local food photos and menu data into app uploads and database rows.",
                    ],
                    STYLES["Body"],
                ),
            ],
        )
    )

    areas = ", ".join(f"{area_label(area)} ({count})" for area, count in counts["areas"])
    categories = ", ".join(f"{area_label(category)} ({count})" for category, count in counts["categories"])
    story.append(
        section(
            "5. Data And Local Relevance",
            [
                Paragraph(f"Current local dataset: {counts['stores']} stores and {counts['foods']} food items.", STYLES["Body"]),
                Paragraph(f"Area distribution: {areas}.", STYLES["Small"]),
                Paragraph(f"Food categories: {categories}.", STYLES["Small"]),
                Paragraph(
                    "This local data makes the project stronger for hackathon judging because the app can be demonstrated with real FEU-area decisions instead of placeholder cards.",
                    STYLES["Body"],
                ),
            ],
        )
    )

    story.append(
        section(
            "6. Demo Script For 4 Minutes",
            [
                bullet_list(
                    [
                        "0:00-0:35 - State the problem: students waste break time deciding where to eat.",
                        "0:35-1:40 - Show home filters: campus, budget, mood, time available, and precise location fallback.",
                        "1:40-2:20 - Open a store menu: show food photos, price, hours, ratings, walk time, and map route.",
                        "2:20-2:55 - Use Pick for Me: demonstrate the wheel and chosen menu.",
                        "2:55-3:30 - Show Tracker: meal logs, streak, today spend, weekly spend, and budget guidance.",
                        "3:30-4:00 - Explain stack and close with impact: Saan? answers a daily FEU question in seconds.",
                    ],
                    STYLES["Body"],
                )
            ],
        )
    )

    story.append(PageBreak())
    story.append(section("7. Judge Questions And Suggested Answers", []))
    qa = [
        (
            "What problem are you solving?",
            "We solve food decision fatigue for FEU students during short breaks. The app narrows options by budget, distance, cravings, campus, and available time.",
        ),
        (
            "Why not just use Google Maps or a food delivery app?",
            "Those tools are broad. Saan? is campus-specific and decision-first: it understands FEU-area walking distance, class breaks, student budgets, and local meal patterns.",
        ),
        (
            "How does the recommendation work?",
            "The backend filters by user constraints, computes walking distance from campus or live location, derives tags such as budget-friendly, quick, halal-friendly, hot-day, rainy-day, and class-safe, then the client ranks results using preferences, history, ratings, budget health, and break fit.",
        ),
        (
            "How do you protect privacy in reviews?",
            "Public reviews show only a masked name, such as Jhe..., and a school tag like FEU-Tech or FEU when the email domain supports it. Full names and emails are never displayed in review cards.",
        ),
        (
            "Can a user spam ratings?",
            "A logged-in user has one rating per store and one rating per food item. If they rate again, the backend updates their previous row instead of inserting a duplicate.",
        ),
        (
            "What happens if location permission is denied?",
            "The app remains usable. It falls back to FEU Tech or FEU Manila coordinates chosen in the campus filter.",
        ),
        (
            "What are the biggest limitations?",
            "Store prices, hours, photos, and menu availability need ongoing verification. The routing estimate can also differ from actual walking time because of crossings, gates, weather, and crowding.",
        ),
        (
            "What would you build next?",
            "Verified merchant updates, queue time signals, safer route notes, better dietary labels, event-based recommendations, and a mobile-first deployment with HTTPS for reliable geolocation.",
        ),
    ]
    for question, answer in qa:
        story.append(Paragraph(question, STYLES["Question"]))
        story.append(Paragraph(answer, STYLES["Body"]))

    story.append(Spacer(1, 10))
    story.append(
        section(
            "8. Closing Pitch",
            [
                Paragraph(
                    "Saan? is a focused, usable hackathon product: local data, working filters, real routes, meal history, budget coaching, privacy-aware ratings, and a clear student problem. It turns 'Saan tayo kakain?' from a long group debate into a fast, informed choice.",
                    STYLES["Body"],
                )
            ],
        )
    )

    doc.build(story, onFirstPage=footer, onLaterPages=footer)


if __name__ == "__main__":
    build_pdf()
    print(OUT)
