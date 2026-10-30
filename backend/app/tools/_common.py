from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal, ROUND_CEILING
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.tables import Product, Sale, SaleItem

REV = func.coalesce(func.sum(SaleItem.qty * SaleItem.unit_price), 0)
PROFIT = func.coalesce(func.sum(SaleItem.qty * (SaleItem.unit_price - SaleItem.unit_cost)), 0)


def money(value: Any) -> float:
    return round(float(value or 0), 2)


def ceil_units(value: float) -> int:
    return int(Decimal(str(max(value, 0))).to_integral_value(rounding=ROUND_CEILING))


def since(days: int) -> datetime:
    return datetime.now() - timedelta(days=days)


def products_matching(db: Session, workspace_id: int, product_name: str | None) -> list[Product]:
    stmt = select(Product).where(Product.workspace_id == workspace_id).order_by(Product.name)
    if product_name:
        stmt = stmt.where(Product.name.ilike(f"%{product_name.strip()}%"))
    return list(db.scalars(stmt))


def product_selector(products: list[Product]) -> dict[str, Any]:
    if len(products) != 1:
        return {
            "matches": [
                {"name": product.name, "stock": product.stock_qty, "reorder_level": product.reorder_level}
                for product in products
            ]
        }
    return {}


def sold_by_product(db: Session, workspace_id: int, days: int) -> dict[int, int]:
    rows = db.execute(
        select(SaleItem.product_id, func.sum(SaleItem.qty))
        .join(Sale)
        .where(Sale.workspace_id == workspace_id, Sale.created_at >= since(days))
        .group_by(SaleItem.product_id)
    ).all()
    return {int(product_id): int(qty or 0) for product_id, qty in rows}


def validate_int(value: Any, name: str, minimum: int, maximum: int) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or not minimum <= value <= maximum:
        raise ValueError(f"{name} must be between {minimum} and {maximum}")
    return value


def validate_days(value: Any, default: int = 30) -> int:
    return validate_int(default if value is None else value, "days", 1, 365)
