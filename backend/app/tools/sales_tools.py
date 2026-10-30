from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.tables import Product, Sale, SaleItem
from app.tools._common import PROFIT, REV, money, since, validate_days, validate_int


def top_and_bottom_sellers(db: Session, workspace_id: int, arguments: dict) -> dict:
    days = validate_days(arguments.get("days"), 30)
    limit = validate_int(arguments.get("limit", 5), "limit", 1, 10)
    rows = db.execute(
        select(
            Product.name, func.sum(SaleItem.qty), func.sum(SaleItem.qty * SaleItem.unit_price),
            func.sum(SaleItem.qty * (SaleItem.unit_price - SaleItem.unit_cost)),
        )
        .join(SaleItem, SaleItem.product_id == Product.id).join(Sale, Sale.id == SaleItem.sale_id)
        .where(Sale.workspace_id == workspace_id, Sale.created_at >= since(days))
        .group_by(Product.id).order_by(func.sum(SaleItem.qty * SaleItem.unit_price).desc())
    ).all()
    products = [
        {"name": name, "units": int(units or 0), "revenue": money(revenue), "profit": money(profit)}
        for name, units, revenue, profit in rows
    ]
    return {"days": days, "top": products[:limit], "bottom": list(reversed(products[-limit:])) if products else []}


def profit_by_product(db: Session, workspace_id: int, arguments: dict) -> list[dict]:
    days = validate_days(arguments.get("days"), 30)
    rows = db.execute(
        select(
            Product.name, func.sum(SaleItem.qty * SaleItem.unit_price),
            func.sum(SaleItem.qty * SaleItem.unit_cost),
            func.sum(SaleItem.qty * (SaleItem.unit_price - SaleItem.unit_cost)),
        )
        .join(SaleItem, SaleItem.product_id == Product.id).join(Sale, Sale.id == SaleItem.sale_id)
        .where(Sale.workspace_id == workspace_id, Sale.created_at >= since(days))
        .group_by(Product.id).order_by(PROFIT.desc())
    ).all()
    return [
        {"name": name, "revenue": money(revenue), "cost": money(cost), "profit": money(profit),
         "margin_pct": round(float(profit or 0) / float(revenue) * 100, 1) if revenue else 0.0}
        for name, revenue, cost, profit in rows
    ]


def sales_summary(db: Session, workspace_id: int, arguments: dict) -> dict:
    days = validate_days(arguments.get("days"), 7)
    end = since(0)
    current_start = since(days)
    previous_start = since(days * 2)
    def totals(start, finish):
        sales, profit, orders = db.execute(
            select(REV, PROFIT, func.count(func.distinct(Sale.id))).join(Sale).where(
                Sale.workspace_id == workspace_id, Sale.created_at >= start, Sale.created_at < finish)
        ).one()
        return money(sales), money(profit), int(orders or 0)
    sales, profit, orders = totals(current_start, end)
    previous_sales, previous_profit, previous_orders = totals(previous_start, current_start)
    return {
        "days": days, "total_sales": sales, "profit": profit, "orders": orders,
        "sales_change_pct": round((sales - previous_sales) / previous_sales * 100, 1) if previous_sales else 0.0,
        "profit_change_pct": round((profit - previous_profit) / previous_profit * 100, 1) if previous_profit else 0.0,
        "previous_orders": previous_orders,
    }
