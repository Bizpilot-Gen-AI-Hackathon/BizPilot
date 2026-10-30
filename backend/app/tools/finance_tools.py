from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.tables import Expense, Product, Sale, SaleItem
from app.tools._common import money, products_matching, since


def price_change_impact(db: Session, workspace_id: int, arguments: dict) -> dict:
    name = arguments.get("product_name")
    new_price = arguments.get("new_price")
    if not isinstance(new_price, (int, float)) or isinstance(new_price, bool) or new_price < 0:
        raise ValueError("new_price must be a non-negative number")
    products = products_matching(db, workspace_id, name)
    if len(products) != 1:
        return {"matches": [{"name": p.name} for p in products]}
    p = products[0]
    rows = db.execute(
        select(func.sum(SaleItem.qty), func.sum(SaleItem.qty * (SaleItem.unit_price - SaleItem.unit_cost)))
        .join(Sale).where(Sale.workspace_id == workspace_id, SaleItem.product_id == p.id,
                          Sale.created_at >= since(30))
    ).one()
    units, current_profit = int(rows[0] or 0), money(rows[1])
    old_margin = money(p.selling_price) - money(p.cost_price)
    new_margin = round(float(new_price) - money(p.cost_price), 2)
    extra_units = max(0, int((float(current_profit) / new_margin + 0.9999999) - units)) if new_margin > 0 else None
    return {"name": p.name, "old_margin": money(old_margin), "new_margin": new_margin,
            "old_profit_per_unit": money(old_margin), "new_profit_per_unit": new_margin,
            "units_last_30_days": units, "extra_units_needed": extra_units}


def cash_buffer(db: Session, workspace_id: int, arguments: dict) -> dict:
    end = date.today()
    start = end - timedelta(days=30)
    total = db.scalar(select(func.sum(Expense.amount)).where(
        Expense.workspace_id == workspace_id, Expense.spent_on >= start, Expense.spent_on <= end)) or 0
    return {"days": 30, "expenses_last_30_days": money(total), "suggested_cash_buffer": money(total)}
