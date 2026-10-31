from __future__ import annotations

import re
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_CEILING
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.tables import Product, Sale, SaleItem

REV = func.coalesce(func.sum(SaleItem.qty * SaleItem.unit_price), 0)
PROFIT = func.coalesce(func.sum(SaleItem.qty * (SaleItem.unit_price - SaleItem.unit_cost)), 0)

_NAME_STOPWORDS = {"the", "an", "of", "and", "for", "in", "my", "check", "stock", "enough", "its", "is", "it"}


def money(value: Any) -> float:
    return round(float(value or 0), 2)


def ceil_units(value: float) -> int:
    return int(Decimal(str(max(value, 0))).to_integral_value(rounding=ROUND_CEILING))


def since(days: int) -> datetime:
    return datetime.now() - timedelta(days=days)


def _compact(text: str) -> str:
    """Lowercase and drop everything except letters and digits, so 'Sun Flower' equals 'sunflower'."""
    return re.sub(r"[^a-z0-9]", "", text.lower())


def _name_tokens(text: str) -> list[str]:
    return [t for t in re.findall(r"[a-z0-9]+", text.lower()) if len(t) > 1 and t not in _NAME_STOPWORDS]


def products_matching(db: Session, workspace_id: int, product_name: str | None) -> list[Product]:
    stmt = select(Product).where(Product.workspace_id == workspace_id).order_by(Product.name)
    products = list(db.scalars(stmt))
    if not product_name or not product_name.strip():
        return products
    query = product_name.strip()

    # 1. The exact phrase appears in the name (the old behaviour, so existing matches don't change).
    lowered = query.lower()
    exact = [p for p in products if lowered in p.name.lower()]
    if exact:
        return exact

    # 2. Same text once spaces and punctuation are ignored, in either direction:
    #    "sun flower oil" finds "Sunflower Oil", and "sunflower oil 1 litre bottle" finds "Sunflower Oil".
    compact_query = _compact(query)
    if compact_query:
        loose = [
            p for p in products
            if compact_query in _compact(p.name)
            or (len(_compact(p.name)) >= 4 and _compact(p.name) in compact_query)
        ]
        if loose:
            return loose

    # 3. Word overlap: at least half of the meaningful words must appear in the name,
    #    and only the best-scoring products are returned.
    tokens = _name_tokens(query)
    if not tokens:
        return []
    needed = max(1, (len(tokens) + 1) // 2)
    scored = []
    for p in products:
        name_compact = _compact(p.name)
        hits = sum(1 for t in tokens if t in name_compact)
        if hits >= needed:
            scored.append((hits, p))
    if not scored:
        return []
    best = max(hits for hits, _ in scored)
    return [p for hits, p in scored if hits == best]


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