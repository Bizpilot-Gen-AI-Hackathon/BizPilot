import random
import sys
from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy import select, text
from app.db.database import SessionLocal
from app.models.tables import Expense, Product, Sale, SaleItem, Workspace
from app.models.tables import User
from app.security import hash_password
random.seed(42)

# name, category, sku, stock, reorder_level, cost, price, popularity weight
PRODUCTS = [
    ("Premium Maize Flour 2kg", "Groceries", "GR-2048", 18, 25, 125, 165, 184),
    ("Sunflower Cooking Oil 1L", "Groceries", "GR-1102", 64, 20, 205, 260, 156),
    ("Long-life Milk 500ml", "Dairy", "DY-0520", 12, 30, 48, 65, 142),
    ("White Bread 400g", "Bakery", "BK-0400", 9, 15, 48, 60, 128),
    ("Laundry Detergent 1kg", "Household", "HH-1020", 43, 15, 150, 195, 96),
    ("Fresh Eggs Tray", "Dairy", "DY-0030", 31, 12, 390, 450, 84),
    ("Bottled Water 1L", "Beverages", "BV-1000", 7, 24, 35, 50, 72),
    ("Instant Coffee 100g", "Beverages", "BV-0100", 27, 10, 180, 230, 63),
]
DAY_TARGET = [28500, 34200, 30100, 42800, 38900, 51600, 46300]  # Mon..Sun
CUSTOMERS = ["Mary Wanjiku", "Peter Mwangi", "Grace Achieng", "John Kamau", "Faith Njeri", "Samuel Otieno"]
EXPENSES = [("Rent", 15000, 27), ("Electricity", 3500, 20), ("Transport", 6000, 14),
            ("Staff wages", 24000, 7), ("Packaging", 2200, 3)]


def add_sale(db, ws_id, ref, when, lines, customer, method):
    sale = Sale(workspace_id=ws_id, ref=ref, created_at=when, customer_name=customer,
                payment_method=method, status="Pending" if method == "Credit" else "Completed")
    total = Decimal(0)
    for product, qty in lines:
        sale.items.append(SaleItem(product_id=product.id, qty=qty,
                                   unit_price=product.selling_price, unit_cost=product.cost_price))
        total += Decimal(product.selling_price) * qty
    sale.total = total
    db.add(sale)
    return float(total)


def main():
    db = SessionLocal()
    if "--reset" in sys.argv:
        db.execute(text("TRUNCATE sale_items, sales, products, expenses, recommendations, users, "
                        "workspaces RESTART IDENTITY CASCADE"))
        db.commit()
    elif db.scalar(select(Workspace.id)):
        print("Already seeded. Run with --reset to start over.")
        return

    ws = Workspace(name="My Business", currency="KES")
    db.add(ws)
    db.flush()
    db.add(User(workspace_id=ws.id, name="Demo Owner", email="demo@bizpilot.com",
                password_hash=hash_password("demo1234"), role="businessOwner"))

    plist = [Product(workspace_id=ws.id, name=n, category=c, sku=s, stock_qty=st, reorder_level=r,
                     cost_price=Decimal(co), selling_price=Decimal(pr))
             for n, c, s, st, r, co, pr, _ in PRODUCTS]
    db.add_all(plist)
    db.flush()
    by_name = {p.name: p for p in plist}
    weights = [w for *_, w in PRODUCTS]

    now = datetime.now()
    counter = 1000
    for d in range(29, -1, -1):
        day = (now - timedelta(days=d)).replace(hour=0, minute=0, second=0, microsecond=0)
        target = DAY_TARGET[day.weekday()] * random.uniform(0.9, 1.1) * (1 + (29 - d) * 0.004)
        today = d == 0
        if today:
            target *= 0.3  # leave room for the five fixed transactions below
        revenue = 0.0
        while revenue < target:
            minutes = random.randint(360, 570) if today else random.randint(420, 1200)
            method = random.choices(["M-Pesa", "Cash", "Credit"], [45, 45, 10])[0]
            named = method == "Credit" or random.random() < 0.3
            lines = [(p, random.randint(1, 3)) for p in
                     random.choices(plist, weights, k=random.choices([1, 2, 3], [60, 30, 10])[0])]
            counter += 1
            revenue += add_sale(db, ws.id, f"TX-{counter}", day + timedelta(minutes=minutes), lines,
                                random.choice(CUSTOMERS) if named else "Walk-in customer", method)

    today0 = now.replace(hour=0, minute=0, second=0, microsecond=0)
    fixed = [  # ref, product, qty, customer, minutes after midnight, method
        ("TX-8428", "Long-life Milk 500ml", 3, "Walk-in customer", 9 * 60 + 41, "Cash"),
        ("TX-8429", "Fresh Eggs Tray", 2, "Peter Mwangi", 9 * 60 + 56, "Credit"),
        ("TX-8430", "Laundry Detergent 1kg", 2, "Walk-in customer", 10 * 60 + 18, "M-Pesa"),
        ("TX-8431", "Premium Maize Flour 2kg", 2, "Mary Wanjiku", 10 * 60 + 35, "Cash"),
        ("TX-8432", "Sunflower Cooking Oil 1L", 2, "Walk-in customer", 10 * 60 + 42, "M-Pesa"),
    ]
    for ref, name, qty, cust, mins, method in fixed:
        add_sale(db, ws.id, ref, today0 + timedelta(minutes=mins), [(by_name[name], qty)], cust, method)

    for cat, amount, days_ago in EXPENSES:
        db.add(Expense(workspace_id=ws.id, category=cat, amount=Decimal(amount),
                       spent_on=(now - timedelta(days=days_ago)).date()))

    db.commit()
    print("Seeded: 1 workspace, 8 products, 30 days of sales, 5 expenses.")


if __name__ == "__main__":
    main()