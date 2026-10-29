from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.tables import Product, Sale, SaleItem

REV = func.coalesce(func.sum(SaleItem.qty * SaleItem.unit_price), 0)
PROFIT = func.coalesce(func.sum(SaleItem.qty * (SaleItem.unit_price - SaleItem.unit_cost)), 0)


def sales_summary(db: Session, workspace_id: int, days: int) -> dict:
    end = datetime.now() + timedelta(days=1)
    start = end - timedelta(days=days)
    sales, profit, orders = db.execute(
        select(REV, PROFIT, func.count(func.distinct(Sale.id)))
        .join(Sale)
        .where(Sale.workspace_id == workspace_id, Sale.created_at >= start, Sale.created_at < end)
    ).one()
    total_sales = float(sales or 0)
    total_profit = float(profit or 0)
    order_count = int(orders or 0)
    return {
        "days": days,
        "total_sales": total_sales,
        "gross_profit": total_profit,
        "order_count": order_count,
        "average_order_value": round(total_sales / order_count, 2) if order_count else 0.0,
    }


def sales_trend(db: Session, workspace_id: int, period: str) -> list[dict]:
    days = 7 if period == "week" else 30
    start = (datetime.now() - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    day = func.date(Sale.created_at)
    rows = db.execute(
        select(day, REV, PROFIT)
        .join(Sale)
        .where(Sale.workspace_id == workspace_id, Sale.created_at >= start)
        .group_by(day)
    ).all()
    grouped = {str(row[0]): (float(row[1] or 0), float(row[2] or 0)) for row in rows}
    return [
        {
            "day": (start + timedelta(days=index)).date().isoformat(),
            "sales": grouped.get((start + timedelta(days=index)).date().isoformat(), (0.0, 0.0))[0],
            "profit": grouped.get((start + timedelta(days=index)).date().isoformat(), (0.0, 0.0))[1],
        }
        for index in range(days)
    ]


def top_products(db: Session, workspace_id: int, days: int, limit: int) -> list[dict]:
    start = datetime.now() - timedelta(days=days)
    rows = db.execute(
        select(
            Product.name,
            Product.sku,
            func.sum(SaleItem.qty),
            func.sum(SaleItem.qty * SaleItem.unit_price),
            func.sum(SaleItem.qty * (SaleItem.unit_price - SaleItem.unit_cost)),
        )
        .join(SaleItem, SaleItem.product_id == Product.id)
        .join(Sale, Sale.id == SaleItem.sale_id)
        .where(Sale.workspace_id == workspace_id, Sale.created_at >= start)
        .group_by(Product.id)
        .order_by(func.sum(SaleItem.qty * SaleItem.unit_price).desc())
        .limit(limit)
    ).all()
    return [
        {"name": name, "sku": sku, "units_sold": int(units or 0), "revenue": float(revenue or 0), "profit": float(profit or 0)}
        for name, sku, units, revenue, profit in rows
    ]


def inventory_summary(db: Session, workspace_id: int, limit: int) -> dict:
    products = db.scalars(select(Product).where(Product.workspace_id == workspace_id)).all()
    low = sorted(
        (p for p in products if p.stock_qty <= p.reorder_level),
        key=lambda product: product.stock_qty / max(product.reorder_level, 1),
    )
    return {
        "total_units": sum(p.stock_qty for p in products),
        "product_count": len(products),
        "needs_review": len(low),
        "critical": sum(1 for p in low if p.stock_qty <= p.reorder_level * 0.35),
        "low_stock": [
            {"name": p.name, "sku": p.sku, "stock": p.stock_qty, "reorder_level": p.reorder_level}
            for p in low[:limit]
        ],
    }


def payment_breakdown(db: Session, workspace_id: int, days: int) -> list[dict]:
    start = datetime.now() - timedelta(days=days)
    rows = db.execute(
        select(Sale.payment_method, func.count(Sale.id), func.sum(Sale.total))
        .where(Sale.workspace_id == workspace_id, Sale.created_at >= start)
        .group_by(Sale.payment_method)
        .order_by(func.sum(Sale.total).desc())
    ).all()
    return [
        {"method": method, "order_count": int(count or 0), "total": float(total or 0)}
        for method, count, total in rows
    ]