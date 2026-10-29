from datetime import date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.routes_data import product_status, totals, units_sold, pct
from app.models.tables import Expense, Product, Sale


def _money(value: float) -> str:
    return f"KES {round(value):,}"


def _name(value: str, length: int = 20) -> str:
    value = str(value)
    return value if len(value) <= length else f"{value[:length - 1]}…"


def _screen(lines: list[str], end: bool = False) -> str:
    prefix = "END " if end else "CON "
    text = "\n".join(lines)
    return prefix + text[: max(0, 159 - len(prefix))]


def _submenu(title: str, options: list[str], invalid: bool = False) -> str:
    lines = [title]
    if invalid:
        lines.append("Invalid choice.")
    lines.extend(options)
    lines.append("0. Back")
    return _screen(lines)


def _products(db: Session, workspace_id: int) -> list[Product]:
    return db.scalars(
        select(Product).where(Product.workspace_id == workspace_id).order_by(Product.id)
    ).all()


def _find_product(db: Session, workspace_id: int, query: str) -> Product | None:
    return db.scalar(
        select(Product).where(
            Product.workspace_id == workspace_id,
            Product.name.ilike(f"%{query.strip()}%"),
        ).order_by(Product.id)
    )


def _sales_today(db: Session, workspace_id: int) -> str:
    now = datetime.now()
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    sales, profit = totals(db, workspace_id, start, now + timedelta(days=1))
    orders = db.scalar(
        select(func.count(Sale.id)).where(
            Sale.workspace_id == workspace_id,
            Sale.created_at >= start,
            Sale.created_at < now + timedelta(days=1),
        )
    ) or 0
    return _screen(["Today's sales", f"Sales: {_money(sales)}",
                    f"Profit: {_money(profit)}", f"Orders: {orders}", "0. Back"])


def _sales_week(db: Session, workspace_id: int) -> str:
    now = datetime.now()
    this_start = now - timedelta(days=7)
    last_start = now - timedelta(days=14)
    current, _ = totals(db, workspace_id, this_start, now + timedelta(seconds=1))
    previous, _ = totals(db, workspace_id, last_start, this_start)
    return _screen(["This week", f"Total: {_money(current)}",
                    f"Change: {pct(current, previous)}% vs last week", "0. Back"])


def _top_products(db: Session, workspace_id: int) -> str:
    sold = units_sold(db, workspace_id, 30)
    products = sorted(_products(db, workspace_id), key=lambda p: sold.get(p.id, 0), reverse=True)[:3]
    lines = ["Top 3 products"]
    lines.extend(f"{i}. {_name(p.name)} {sold.get(p.id, 0)}u" for i, p in enumerate(products, 1))
    if len(lines) == 1:
        lines.append("No sales yet.")
    lines.append("0. Back")
    return _screen(lines)


def _stock_list(db: Session, workspace_id: int, out_of_stock: bool) -> str:
    products = [
        p for p in _products(db, workspace_id)
        if (p.stock_qty == 0 if out_of_stock else p.stock_qty <= p.reorder_level)
    ][:4]
    lines = ["Out of stock" if out_of_stock else "Low stock"]
    lines.extend(f"{_name(p.name)}: {p.stock_qty} left" for p in products)
    if not products:
        lines.append("None found.")
    lines.append("0. Back")
    return _screen(lines)


def _reorder(db: Session, workspace_id: int) -> str:
    products = [
        p for p in _products(db, workspace_id)
        if p.stock_qty <= p.reorder_level
        and product_status(p.stock_qty, p.reorder_level) in {"Low stock", "Critical"}
    ][:4]
    lines = ["What to reorder"]
    for p in products:
        qty = max(p.reorder_level * 2 - p.stock_qty, 0)
        lines.append(f"{_name(p.name)}: {qty}u {_money(qty * p.cost_price)}")
    if not products:
        lines.append("Nothing to reorder.")
    lines.append("0. Back")
    return _screen(lines)


def _debts(db: Session, workspace_id: int) -> str:
    rows = db.execute(
        select(Sale.customer_name, func.sum(Sale.total))
        .where(Sale.workspace_id == workspace_id, Sale.status == "Pending")
        .group_by(Sale.customer_name)
        .order_by(func.sum(Sale.total).desc())
    ).all()
    total = sum(float(amount or 0) for _, amount in rows)
    lines = ["Who owes me"]
    lines.extend(f"{_name(name)}: {_money(float(amount))}" for name, amount in rows[:3])
    lines.append(f"Total: {_money(total)}")
    lines.append("0. Back")
    return _screen(lines)


def _expenses(db: Session, workspace_id: int) -> str:
    first = date.today().replace(day=1)
    rows = db.execute(
        select(Expense.category, func.sum(Expense.amount))
        .where(Expense.workspace_id == workspace_id, Expense.spent_on >= first)
        .group_by(Expense.category)
        .order_by(func.sum(Expense.amount).desc())
    ).all()
    total = sum(float(amount or 0) for _, amount in rows)
    largest = f"{_name(rows[0][0])}: {_money(float(rows[0][1]))}" if rows else "None"
    return _screen(["Expenses this month", f"Total: {_money(total)}", f"Largest: {largest}", "0. Back"])


def _cash_to_keep(db: Session, workspace_id: int) -> str:
    since = date.today() - timedelta(days=30)
    total = db.scalar(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.workspace_id == workspace_id, Expense.spent_on >= since
        )
    ) or 0
    return _screen(["Cash to keep", f"About {_money(round(float(total) / 2 / 1000) * 1000)}", "0. Back"])


def _product_price_advice(db: Session, workspace_id: int, query: str) -> str:
    product = _find_product(db, workspace_id, query)
    if not product:
        return _screen(["Product not found.", "0. Back"])
    old_profit = float(product.selling_price - product.cost_price)
    new_profit = float(product.selling_price * 0.9 - product.cost_price)
    needed = round((old_profit / new_profit - 1) * 100, 1) if new_profit > 0 else None
    extra = f"{needed}% more units" if needed is not None else "Not profitable"
    return _screen([_name(product.name), f"Cost: {_money(product.cost_price)}",
                    f"Price: {_money(product.selling_price)}", f"Unit profit: {_money(old_profit)}",
                    f"At 10% lower: {extra}", "0. Back"])


def _main_menu() -> str:
    return _screen(["BizPilot", "1. Sales", "2. Stock check", "3. Reorder help",
                    "4. Money & credit", "5. Ask BizPilot", "6. Exit"])


def _back_text(parts: list[str]) -> str:
    """Remove the selected item and its Back choice from the USSD chain."""
    return "*".join(parts[:-2])


def handle_ussd(db: Session, workspace_id: int, text: str) -> str:
    try:
        # Africa's Talking may submit a trailing separator when a screen is
        # submitted from its simulator or a handset.
        normalized_text = str(text or "").strip().strip("*")
        parts = [part.strip() for part in normalized_text.split("*") if part.strip()] if normalized_text else []
        choice = parts[-1] if parts else ""
        if not parts:
            return _main_menu()
        if choice == "0":
            return handle_ussd(db, workspace_id, _back_text(parts))
        if parts[0] == "6":
            return _screen(["Thank you for using BizPilot."], end=True)
        if parts[0] == "1":
            if len(parts) == 1:
                return _submenu("Sales", ["1. Today's sales", "2. This week", "3. Top 3 products"])
            if len(parts) == 2 and choice == "1":
                return _sales_today(db, workspace_id)
            if len(parts) == 2 and choice == "2":
                return _sales_week(db, workspace_id)
            if len(parts) == 2 and choice == "3":
                return _top_products(db, workspace_id)
            return _submenu("Sales", ["1. Today's sales", "2. This week", "3. Top 3 products"], True)
        if parts[0] == "2":
            if len(parts) == 1:
                return _submenu("Stock check", ["1. Low stock", "2. Out of stock", "3. Find a product"])
            if len(parts) == 2 and choice == "1":
                return _stock_list(db, workspace_id, False)
            if len(parts) == 2 and choice == "2":
                return _stock_list(db, workspace_id, True)
            if len(parts) == 2 and choice == "3":
                return _screen(["Find a product", "Type product name", "0. Back"])
            if len(parts) >= 3 and parts[1] == "3":
                product = _find_product(db, workspace_id, "*".join(parts[2:]))
                return _screen([f"{_name(product.name)}: {product.stock_qty} left",
                                f"Price: {_money(product.selling_price)}", "0. Back"]
                               if product else ["Product not found.", "0. Back"])
            return _submenu("Stock check", ["1. Low stock", "2. Out of stock", "3. Find a product"], True)
        if parts[0] == "3":
            if len(parts) == 1:
                return _submenu("Reorder help", ["1. What to reorder", "2. Supplier contact"])
            if len(parts) == 2 and choice == "1":
                return _reorder(db, workspace_id)
            if len(parts) == 2 and choice == "2":
                return _screen(["Supplier details not set yet."], end=True)
            return _submenu("Reorder help", ["1. What to reorder", "2. Supplier contact"], True)
        if parts[0] == "4":
            if len(parts) == 1:
                return _submenu("Money & credit", ["1. Who owes me", "2. Expenses", "3. Cash to keep"])
            if len(parts) == 2 and choice == "1":
                return _debts(db, workspace_id)
            if len(parts) == 2 and choice == "2":
                return _expenses(db, workspace_id)
            if len(parts) == 2 and choice == "3":
                return _cash_to_keep(db, workspace_id)
            return _submenu("Money & credit", ["1. Who owes me", "2. Expenses", "3. Cash to keep"], True)
        if parts[0] == "5":
            if len(parts) == 1:
                return _submenu("Ask BizPilot", ["1. Best seller", "2. Lower a price?"])
            if len(parts) == 2 and choice == "1":
                sold = units_sold(db, workspace_id, 7)
                product = max(_products(db, workspace_id), key=lambda p: sold.get(p.id, 0), default=None)
                return _screen([f"Best seller: {_name(product.name)}", f"{sold.get(product.id, 0)} units this week",
                                "0. Back"] if product else ["No sales this week.", "0. Back"])
            if len(parts) == 2 and choice == "2":
                return _screen(["Lower a price?", "Type product name", "0. Back"])
            if len(parts) >= 3 and parts[1] == "2":
                return _product_price_advice(db, workspace_id, "*".join(parts[2:]))
            return _submenu("Ask BizPilot", ["1. Best seller", "2. Lower a price?"], True)
        return _screen(["Invalid choice.", "BizPilot", "1. Sales", "2. Stock check", "3. Reorder help",
                        "4. Money & credit", "5. Ask BizPilot", "6. Exit"])
    except Exception:
        return "END Sorry, something went wrong. Please try again."
