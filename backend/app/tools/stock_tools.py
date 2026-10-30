from __future__ import annotations

from sqlalchemy.orm import Session

from app.api.routes_data import product_status
from app.models.tables import Product
from app.tools._common import ceil_units, money, products_matching, sold_by_product, validate_days, validate_int


def _selected(db: Session, workspace_id: int, name: str | None) -> list[Product]:
    return products_matching(db, workspace_id, name)


def get_stock(db: Session, workspace_id: int, arguments: dict) -> dict:
    products = _selected(db, workspace_id, arguments.get("product_name"))
    if len(products) != 1:
        return {"matches": [{"name": p.name, "stock": p.stock_qty, "reorder_level": p.reorder_level} for p in products]}
    p = products[0]
    return {"name": p.name, "stock": p.stock_qty, "reorder_level": p.reorder_level,
            "status": product_status(p.stock_qty, p.reorder_level)}


def days_until_stockout(db: Session, workspace_id: int, arguments: dict) -> dict:
    lookback = validate_days(arguments.get("lookback_days"), 14)
    products = _selected(db, workspace_id, arguments.get("product_name"))
    if len(products) != 1:
        return {"matches": [{"name": p.name} for p in products]}
    p = products[0]
    average = sold_by_product(db, workspace_id, lookback).get(p.id, 0) / lookback
    return {"name": p.name, "average_daily_units": round(average, 2),
            "days_left": round(p.stock_qty / average, 1) if average else None}


def reorder_quantity(db: Session, workspace_id: int, arguments: dict) -> dict:
    cover_days = validate_days(arguments.get("cover_days"), 14)
    products = _selected(db, workspace_id, arguments.get("product_name"))
    if len(products) != 1:
        return {"matches": [{"name": p.name} for p in products]}
    p = products[0]
    average = sold_by_product(db, workspace_id, 14).get(p.id, 0) / 14
    suggested = ceil_units(average * cover_days - p.stock_qty)
    return {"name": p.name, "average_daily_units": round(average, 2), "suggested_units": suggested,
            "estimated_cost": money(suggested * p.cost_price), "cover_days": cover_days}
