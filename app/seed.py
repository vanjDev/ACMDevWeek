from app.database import SessionLocal, init_db
from app.models import FoodSpot, Store


FOOD_SPOTS = [
    ("Banana Rhuma", "Mang Tootz Food House", 40, 65, "snacks", "quick_lunch", 14.6028, 120.9895, "p_campa", 4.8, "Sweet fried banana rolls that Morayta students keep coming back for."),
    ("Porksilog", "Mang Tootz Food House", 75, 95, "rice_meals", "quick_lunch", 14.6028, 120.9895, "p_campa", 4.6, "Reliable silog plate when you want something filling before class."),
    ("Siomai Rice", "Dimsum Treats", 45, 65, "dimsum", "quick_lunch", 14.6038, 120.9887, "lerma", 4.4, "Fast, cheap, and exactly the kind of comfort food that saves a short break."),
    ("Sharksfin Rice", "Dimsum Treats", 55, 75, "dimsum", "study_fuel", 14.6038, 120.9887, "lerma", 4.2, "A warm dimsum rice bowl that travels well to a study table."),
    ("Chicken Fillet Rice", "Ate Rica's Bacsilog", 85, 120, "chicken", "quick_lunch", 14.6044, 120.9886, "near_feu_tech", 4.3, "Creamy rice meal with a student-friendly serving size."),
    ("Bacsilog", "Ate Rica's Bacsilog", 95, 135, "rice_meals", "group_meal", 14.6044, 120.9886, "near_feu_tech", 4.5, "Cheesy bacon rice for days when everyone wants the same easy answer."),
    ("Fishball Cup", "Hepa Lane Street Food", 15, 35, "street_food", "quick_lunch", 14.6035, 120.9879, "hepa_lane", 4.1, "Classic tusok-tusok snack for very tight budgets."),
    ("Kikiam and Squid Balls", "Hepa Lane Street Food", 20, 45, "street_food", "late_night", 14.6034, 120.9878, "hepa_lane", 4.0, "Saucy street food stop for late dismissal cravings."),
    ("Budget Pork Chop", "Lerma Carinderia Row", 55, 80, "rice_meals", "quick_lunch", 14.6040, 120.9875, "lerma", 4.2, "Simple carinderia rice meal with enough heft for a long afternoon."),
    ("Giniling Rice", "Lerma Carinderia Row", 45, 65, "rice_meals", "quick_lunch", 14.6040, 120.9875, "lerma", 4.0, "A practical, no-drama lunch under a hundred pesos."),
    ("Iced Spanish Latte", "1008 Kopi", 95, 150, "coffee_drinks", "study_fuel", 14.6051, 120.9878, "near_feu_tech", 4.5, "Sweet caffeine for laptop hours and group project survival."),
    ("Kopi Bun Set", "1008 Kopi", 120, 185, "snacks", "chill_hangout", 14.6051, 120.9878, "near_feu_tech", 4.4, "Coffee and bread combo when the break is more tambay than meal."),
    ("Americano", "Obscure Cafe", 90, 140, "coffee_drinks", "study_fuel", 14.6025, 120.9901, "p_campa", 4.3, "Straightforward coffee near Morayta for focused work."),
    ("Chicken Pesto Sandwich", "Obscure Cafe", 150, 220, "snacks", "chill_hangout", 14.6025, 120.9901, "p_campa", 4.1, "A calmer cafe pick when you want something lighter than rice."),
    ("Canteen Chicken Meal", "FEU Tech Canteen", 70, 110, "chicken", "quick_lunch", 14.6042, 120.9882, "inside_campus", 4.0, "The safest answer when time is brutally short."),
    ("Canteen Pasta", "FEU Tech Canteen", 60, 95, "snacks", "study_fuel", 14.6042, 120.9882, "inside_campus", 3.9, "Easy campus bite you can squeeze between classes."),
    ("Burger Steak", "Jollibee Morayta", 75, 130, "rice_meals", "group_meal", 14.6048, 120.9893, "near_feu_manila", 4.1, "Predictable fast-food comfort close to both campuses."),
    ("Chickenjoy Meal", "Jollibee Morayta", 105, 190, "chicken", "group_meal", 14.6048, 120.9893, "near_feu_manila", 4.3, "The classic group fallback when nobody wants to debate."),
    ("McChicken Meal", "McDonald's Morayta", 150, 230, "burgers", "late_night", 14.6049, 120.9896, "near_feu_manila", 4.1, "Good for late study sessions and fast charging breaks."),
    ("Cheeseburger", "McDonald's Morayta", 75, 120, "burgers", "quick_lunch", 14.6049, 120.9896, "near_feu_manila", 4.0, "A compact pick when you need food you can finish quickly."),
    ("Classic Milk Tea", "Dakasi Morayta", 95, 155, "coffee_drinks", "chill_hangout", 14.6041, 120.9897, "near_feu_manila", 4.2, "Sweet drink stop for decompression after exams."),
    ("Wintermelon Milk Tea", "Moonleaf Morayta", 90, 150, "coffee_drinks", "chill_hangout", 14.6037, 120.9898, "near_feu_manila", 4.1, "A familiar milk tea choice for casual group hangs."),
    ("Beef Pares Rice", "Paresan sa Lerma", 65, 95, "rice_meals", "late_night", 14.6042, 120.9874, "lerma", 4.4, "Hot, savory, and especially good when dismissal runs late."),
    ("Mami Bowl", "Paresan sa Lerma", 55, 85, "rice_meals", "late_night", 14.6042, 120.9874, "lerma", 4.0, "Soup option for rainy Morayta afternoons."),
    ("Chicken Wings Rice", "Wing Corner", 99, 159, "chicken", "group_meal", 14.6031, 120.9881, "hepa_lane", 4.2, "Saucy wings that make sense when friends want to share flavors."),
    ("Unli Rice Chicken", "Wing Corner", 129, 189, "unli_rice", "group_meal", 14.6031, 120.9881, "hepa_lane", 4.3, "For the friend group with one person who says they are starving."),
    ("Sisig Rice", "P. Campa Sisigan", 75, 110, "rice_meals", "late_night", 14.6029, 120.9900, "p_campa", 4.4, "Sizzling-style rice meal without going too far from campus."),
    ("Chicken Sisig", "P. Campa Sisigan", 85, 125, "chicken", "quick_lunch", 14.6029, 120.9900, "p_campa", 4.2, "A punchy rice bowl for short but satisfying lunches."),
    ("Tapsilog", "Morayta Tapsihan", 85, 130, "rice_meals", "study_fuel", 14.6053, 120.9889, "near_feu_tech", 4.1, "Salty-sweet tapsilog that can carry a long review session."),
    ("Longsilog", "Morayta Tapsihan", 75, 115, "rice_meals", "quick_lunch", 14.6053, 120.9889, "near_feu_tech", 4.0, "Breakfast-for-lunch energy, any time of day."),
    ("Takoyaki", "Tokyo Bites", 60, 120, "snacks", "chill_hangout", 14.6036, 120.9903, "p_campa", 4.2, "Snackable, shareable, and good for walking conversations."),
    ("Chicken Karaage Rice", "Tokyo Bites", 115, 175, "chicken", "study_fuel", 14.6036, 120.9903, "p_campa", 4.3, "Crisp chicken rice bowl for a bigger study meal."),
    ("Classic Shawarma Rice", "Shawarma Shack Morayta", 79, 119, "rice_meals", "quick_lunch", 14.6046, 120.9891, "near_feu_manila", 4.2, "Fast, saucy rice meal with a dependable price range."),
    ("Beef Shawarma Wrap", "Shawarma Shack Morayta", 89, 139, "snacks", "quick_lunch", 14.6046, 120.9891, "near_feu_manila", 4.1, "Portable lunch when seats are impossible to find."),
    ("Potato Corner Fries", "Potato Corner", 45, 135, "snacks", "chill_hangout", 14.6047, 120.9892, "near_feu_manila", 4.4, "The low-commitment snack that still feels like a treat."),
    ("Fruit Soda", "Refreshers Morayta", 45, 85, "coffee_drinks", "quick_lunch", 14.6039, 120.9886, "lerma", 3.9, "Cold drink for the walk back to class."),
    ("Iced Coffee", "Refreshers Morayta", 55, 95, "coffee_drinks", "study_fuel", 14.6039, 120.9886, "lerma", 4.0, "Budget caffeine without cafe pricing."),
    ("Corn Dog", "Snack Stop Lerma", 55, 95, "snacks", "quick_lunch", 14.6043, 120.9877, "lerma", 4.0, "Crispy handheld snack for quick in-between bites."),
    ("Burger Combo", "Snack Stop Lerma", 80, 140, "burgers", "quick_lunch", 14.6043, 120.9877, "lerma", 3.9, "Affordable burger-and-drink combo close to FEU Tech."),
    ("Unli Wings", "Morayta Wings Hub", 199, 299, "unli_rice", "group_meal", 14.6027, 120.9888, "hepa_lane", 4.5, "Best saved for longer breaks and decisive friend groups."),
    ("Nachos Barkada", "Morayta Wings Hub", 150, 240, "snacks", "group_meal", 14.6027, 120.9888, "hepa_lane", 4.2, "A sharing plate for post-event debriefs."),
    ("Canton Guisado", "FEU Manila Canteen", 50, 85, "snacks", "quick_lunch", 14.6033, 120.9892, "inside_campus", 3.8, "Campus-safe noodles when rain or time says stay inside."),
    ("Rice Toppings", "FEU Manila Canteen", 60, 100, "rice_meals", "quick_lunch", 14.6033, 120.9892, "inside_campus", 3.9, "Simple student meal with almost no walking cost."),
    ("Iced Matcha", "Study Nook Cafe", 115, 180, "coffee_drinks", "study_fuel", 14.6050, 120.9872, "near_feu_tech", 4.4, "A quieter drink pick for coding, reading, or cramming."),
    ("Tuna Melt", "Study Nook Cafe", 135, 210, "snacks", "study_fuel", 14.6050, 120.9872, "near_feu_tech", 4.2, "Filling enough for work mode without feeling too heavy."),
]

STORE_HOURS = {
    "FEU Tech Canteen": ("07:00", "19:00"),
    "FEU Manila Canteen": ("07:00", "19:00"),
    "Jollibee Morayta": ("07:00", "23:00"),
    "McDonald's Morayta": ("00:00", "23:59"),
    "Hepa Lane Street Food": ("10:00", "23:30"),
    "Paresan sa Lerma": ("09:00", "23:59"),
    "P. Campa Sisigan": ("10:00", "23:00"),
    "Morayta Wings Hub": ("11:00", "23:00"),
}


def hours_for_store(name: str, mood: str) -> tuple[str, str]:
    if name in STORE_HOURS:
        return STORE_HOURS[name]
    if mood == "late_night":
        return ("10:00", "23:00")
    if "Cafe" in name or "Kopi" in name:
        return ("08:00", "22:00")
    return ("08:00", "21:00")


OBSCURE_CAFE = {
    "restaurant": "Obscure Cafe",
    "latitude": 14.6025,
    "longitude": 120.9901,
    "area": "p_campa",
    "rating": 4.3,
}

OBSCURE_CAFE_MENU = [
    ("Hot Espresso", 90, 90, "coffee_drinks", "study_fuel", "Hot Coffee"),
    ("Hot Americano", 110, 120, "coffee_drinks", "study_fuel", "Hot Coffee"),
    ("Hot Lotus Oreo Latte", 155, 165, "coffee_drinks", "chill_hangout", "Hot Coffee"),
    ("Hot Flat White", 115, 125, "coffee_drinks", "study_fuel", "Hot Coffee"),
    ("Hot Latte", 140, 150, "coffee_drinks", "study_fuel", "Hot Coffee"),
    ("Hot Cappuccino", 140, 150, "coffee_drinks", "study_fuel", "Hot Coffee"),
    ("Hot Caramel Latte", 155, 165, "coffee_drinks", "chill_hangout", "Hot Coffee"),
    ("Hot Tiramisu Latte", 155, 165, "coffee_drinks", "chill_hangout", "Hot Coffee"),
    ("Hot Mocha Hazelnut Latte", 160, 165, "coffee_drinks", "chill_hangout", "Hot Coffee"),
    ("Hot Spanish Latte", 155, 170, "coffee_drinks", "study_fuel", "Hot Coffee"),
    ("Hot Creamy Vanilla Latte", 155, 165, "coffee_drinks", "chill_hangout", "Hot Coffee"),
    ("Hot Creamy Matcha Latte", 155, 165, "coffee_drinks", "study_fuel", "Hot Coffee"),
    ("Hot Tsokolate", 140, 150, "coffee_drinks", "chill_hangout", "Hot Coffee"),
    ("Hot White Mocha Latte", 140, 150, "coffee_drinks", "chill_hangout", "Hot Coffee"),
    ("Iced Americano", 120, 120, "coffee_drinks", "study_fuel", "Iced Coffee"),
    ("Iced Latte", 150, 150, "coffee_drinks", "study_fuel", "Iced Coffee"),
    ("Iced Affogato", 160, 160, "coffee_drinks", "chill_hangout", "Iced Coffee"),
    ("Iced Caramel Latte", 165, 165, "coffee_drinks", "chill_hangout", "Iced Coffee"),
    ("Iced Salted Caramel Latte", 165, 165, "coffee_drinks", "chill_hangout", "Iced Coffee"),
    ("Iced Tiramisu Latte", 165, 165, "coffee_drinks", "chill_hangout", "Iced Coffee"),
    ("Iced Mocha Hazelnut Latte", 170, 170, "coffee_drinks", "chill_hangout", "Iced Coffee"),
    ("Iced Creamy Vanilla Latte", 170, 170, "coffee_drinks", "chill_hangout", "Iced Coffee"),
    ("Iced Creamy Matcha", 165, 165, "coffee_drinks", "study_fuel", "Iced Coffee"),
    ("Iced Tsokolate", 150, 150, "coffee_drinks", "chill_hangout", "Iced Coffee"),
    ("Iced Spanish Latte", 170, 170, "coffee_drinks", "study_fuel", "Iced Coffee"),
    ("Avo Latte", 180, 180, "coffee_drinks", "chill_hangout", "Iced Coffee"),
    ("Cold Brew", 140, 140, "coffee_drinks", "study_fuel", "Iced Coffee"),
    ("Coffee Jelly", 185, 185, "coffee_drinks", "chill_hangout", "Iced Coffee"),
    ("Iced White Mocha Latte", 165, 165, "coffee_drinks", "chill_hangout", "Iced Coffee"),
    ("Caramel Cereal Float", 195, 195, "coffee_drinks", "chill_hangout", "Summer Treats"),
    ("Creamy Ube Float", 195, 195, "coffee_drinks", "chill_hangout", "Summer Treats"),
    ("Oreo Float", 195, 195, "coffee_drinks", "chill_hangout", "Summer Treats"),
    ("Java Chip Frappe", 175, 175, "coffee_drinks", "chill_hangout", "Frappe - Coffee"),
    ("White Chocolate Frappe", 175, 175, "coffee_drinks", "chill_hangout", "Frappe - Coffee"),
    ("Caramel Frappe", 175, 175, "coffee_drinks", "chill_hangout", "Frappe - Coffee"),
    ("Salted Caramel Frappe", 175, 175, "coffee_drinks", "chill_hangout", "Frappe - Coffee"),
    ("Mocha Frappe", 175, 175, "coffee_drinks", "chill_hangout", "Frappe - Coffee"),
    ("Caramel Cream Frappe", 155, 155, "coffee_drinks", "chill_hangout", "Frappe - Coffee Free"),
    ("Salted Caramel Cream Frappe", 155, 155, "coffee_drinks", "chill_hangout", "Frappe - Coffee Free"),
    ("Chocolate Cream Frappe", 155, 155, "coffee_drinks", "chill_hangout", "Frappe - Coffee Free"),
    ("Matcha Cream Frappe", 175, 175, "coffee_drinks", "study_fuel", "Frappe - Coffee Free"),
    ("Citron Iced Tea", 150, 150, "coffee_drinks", "chill_hangout", "Iced Tea"),
    ("Jasmine Peach Iced Tea", 150, 150, "coffee_drinks", "chill_hangout", "Iced Tea"),
    ("Passion Fruit Iced Tea", 150, 150, "coffee_drinks", "chill_hangout", "Iced Tea"),
    ("Honey Ginger Lemon Iced Tea", 150, 150, "coffee_drinks", "chill_hangout", "Iced Tea"),
    ("Strawberry Banana Smoothie", 165, 165, "coffee_drinks", "chill_hangout", "Smoothie"),
    ("Mixed Berry Smoothie", 165, 165, "coffee_drinks", "chill_hangout", "Smoothie"),
    ("Peanut Butter Banana Smoothie", 160, 160, "coffee_drinks", "chill_hangout", "Smoothie"),
    ("Avocado Smoothie", 185, 185, "coffee_drinks", "chill_hangout", "Smoothie"),
    ("Lemon Bobba", 150, 150, "coffee_drinks", "chill_hangout", "Juices & Mocktails"),
    ("Strawberry Lemonade", 150, 150, "coffee_drinks", "chill_hangout", "Juices & Mocktails"),
    ("Mango Mint Bobba", 160, 160, "coffee_drinks", "chill_hangout", "Juices & Mocktails"),
    ("Very Mint Peach", 160, 160, "coffee_drinks", "chill_hangout", "Juices & Mocktails"),
    ("Peach Mojito", 170, 170, "coffee_drinks", "chill_hangout", "Juices & Mocktails"),
    ("Strawberry Mojito", 170, 170, "coffee_drinks", "chill_hangout", "Juices & Mocktails"),
    ("Bacon & Mushroom Pasta", 255, 255, "snacks", "chill_hangout", "Pasta"),
    ("Creamy Chicken Pesto Pasta", 235, 235, "chicken", "chill_hangout", "Pasta"),
    ("Linguine Pomodoro", 225, 225, "snacks", "chill_hangout", "Pasta"),
    ("Aglio Olio Vegan Pasta", 190, 190, "snacks", "study_fuel", "Pasta"),
    ("Avocado Toast", 210, 210, "snacks", "study_fuel", "Sandwich"),
    ("BLT Sandwich", 199, 199, "snacks", "chill_hangout", "Sandwich"),
    ("Chicken Fajitas", 200, 200, "chicken", "chill_hangout", "Sandwich"),
    ("Obscure Ultimate Sandwich", 220, 220, "snacks", "chill_hangout", "Sandwich"),
    ("Mookies", 70, 70, "snacks", "quick_lunch", "Pastries"),
    ("Revel Bar", 80, 80, "snacks", "quick_lunch", "Pastries"),
    ("Blueberry Cheesecake", 165, 165, "snacks", "chill_hangout", "Pastries"),
    ("Oreo Cheesecake", 165, 165, "snacks", "chill_hangout", "Pastries"),
    ("Red Velvet Cake", 145, 145, "snacks", "chill_hangout", "Pastries"),
    ("All-Cheese Cheesecake", 160, 160, "snacks", "chill_hangout", "Pastries"),
    ("Carrot Cake", 180, 180, "snacks", "chill_hangout", "Pastries"),
    ("Tiramisu", 160, 160, "snacks", "chill_hangout", "Pastries"),
    ("Classic Egg Tart", 40, 40, "snacks", "quick_lunch", "Pastries"),
    ("Assorted Balls w/ Sweet n Sour", 150, 150, "street_food", "group_meal", "Pica-Pica"),
    ("Classic Hong Kong Egg Waffle", 140, 140, "snacks", "chill_hangout", "Hong Kong Egg Waffle"),
    ("Banana Split Egg Waffle", 175, 175, "snacks", "chill_hangout", "Hong Kong Egg Waffle"),
    ("Cookies and Cream Egg Waffle", 170, 170, "snacks", "chill_hangout", "Hong Kong Egg Waffle"),
    ("Cereal and Cream Egg Waffle", 170, 170, "snacks", "chill_hangout", "Hong Kong Egg Waffle"),
]

STORE_HOURS[OBSCURE_CAFE["restaurant"]] = ("08:00", "22:00")
FOOD_SPOTS = [item for item in FOOD_SPOTS if item[1] != OBSCURE_CAFE["restaurant"]]
FOOD_SPOTS.extend(
    (
        name,
        OBSCURE_CAFE["restaurant"],
        price_min,
        price_max,
        category,
        mood,
        OBSCURE_CAFE["latitude"],
        OBSCURE_CAFE["longitude"],
        OBSCURE_CAFE["area"],
        OBSCURE_CAFE["rating"],
        f"{section} item from Obscure Cafe. Open 8 AM - 10 PM.",
    )
    for name, price_min, price_max, category, mood, section in OBSCURE_CAFE_MENU
)


def seed() -> None:
    init_db()
    db = SessionLocal()
    try:
        if db.query(FoodSpot).count():
            print("Seed skipped: food_spots already has data.")
            return

        stores: dict[str, Store] = {}
        for item in FOOD_SPOTS:
            store = stores.get(item[1])
            if not store:
                opens_at, closes_at = hours_for_store(item[1], item[5])
                store = Store(
                    name=item[1],
                    latitude=item[6],
                    longitude=item[7],
                    area=item[8],
                    rating=item[9],
                    image_url=None,
                    opens_at=opens_at,
                    closes_at=closes_at,
                    is_active=True,
                )
                stores[item[1]] = store
                db.add(store)

            store.rating = max(store.rating, item[9])

            db.add(
                FoodSpot(
                    store=store,
                    name=item[0],
                    restaurant=item[1],
                    price_min=item[2],
                    price_max=item[3],
                    category=item[4],
                    mood=item[5],
                    latitude=item[6],
                    longitude=item[7],
                    area=item[8],
                    rating=item[9],
                    description=item[10],
                )
            )
        db.commit()
        print(f"Seeded {len(FOOD_SPOTS)} food spots.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
