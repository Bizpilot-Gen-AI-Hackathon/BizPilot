from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload
from app.api.deps import current_workspace
from app.db.database import get_db
from app.models.tables import Product, Sale, SaleItem

router = APIRouter()

REV = func.coalesce(func.sum(SaleItem.qty * SaleItem.unit_price), 0)
PROFIT = func.coalesce(func.sum(SaleItem.qty * (SaleItem.unit_price - SaleItem.unit_cost)), 0)

def product_status(stock: int, reorder: int) -> str:
    if stock <= reorder * 0.35:
        return "Critical"
    return "Low stock" if stock <= reorder else "In stock"


def units_sold(db: Session, ws: int, days: int) -> dict[int, int]:
    since = datetime.now() - timedelta(days=days)
    rows = db.execute(
        select(SaleItem.product_id, func.sum(SaleItem.qty)).join(Sale)
        .where(Sale.workspace_id == ws, Sale.created_at >= since)
        .group_by(SaleItem.product_id)
    ).all()
    return {pid: int(q) for pid, q in rows}


def product_out(p: Product, sold: int) -> dict:
    return {"id": p.code, "name": p.name, "category": p.category, "sku": p.sku,
            "stock": p.stock_qty, "reorderAt": p.reorder_level,
            "cost": float(p.cost_price), "price": float(p.selling_price),
            "sold": sold, "status": product_status(p.stock_qty, p.reorder_level)}


@router.get("/products")
@router.get("/inventory")
def products(db: Session = Depends(get_db), ws: int = Depends(current_workspace)):
    sold = units_sold(db, ws, 30)
    rows = db.scalars(select(Product).where(Product.workspace_id == ws).order_by(Product.id)).all()
    return [product_out(p, sold.get(p.id, 0)) for p in rows]


@router.get("/alerts")
def alerts(db: Session = Depends(get_db), ws: int = Depends(current_workspace)):
    sold = units_sold(db, ws, 14)
    rows = db.scalars(select(Product).where(Product.workspace_id == ws)).all()
    urgent = [p for p in rows if p.stock_qty <= p.reorder_level]
    urgent.sort(key=lambda p: p.stock_qty / max(p.reorder_level, 1))
    out = []
    for i, p in enumerate(urgent, 1):
        critical = product_status(p.stock_qty, p.reorder_level) == "Critical"
        avg = round(sold.get(p.id, 0) / 14)
        out.append({
            "id": i, "type": "critical" if critical else "warning",
            "title": f"{p.name} is almost out" if critical else f"{p.name} is running low",
            "detail": f"{p.stock_qty} units left · {p.reorder_level} units recommended"
                      if critical else f"{p.stock_qty} units left · Average {avg} sold daily",
            "action": "Review stock" if critical else "Plan reorder",
        })
    return out


@router.get("/transactions")
@router.get("/sales")
def transactions(limit: int = Query(5, le=200), q: str = "", status: str = "",
                 db: Session = Depends(get_db), ws: int = Depends(current_workspace)):
    stmt = (select(Sale).where(Sale.workspace_id == ws)
            .options(selectinload(Sale.items).selectinload(SaleItem.product))
            .order_by(Sale.created_at.desc()).limit(limit))
    if status:
        stmt = stmt.where(Sale.status == status)
    if q:
        stmt = stmt.where(Sale.ref.ilike(f"%{q}%") | Sale.customer_name.ilike(f"%{q}%"))
    out = []
    for s in db.scalars(stmt):
        label = s.items[0].product.name + (f" +{len(s.items) - 1} more" if len(s.items) > 1 else "")
        out.append({"id": s.ref, "item": label, "customer": s.customer_name,
                    "time": s.created_at.strftime("%I:%M %p"), "createdAt": s.created_at.isoformat(),
                    "method": s.payment_method, "amount": float(s.total), "status": s.status})
    return out


def totals(db, ws, start, end):
    r = db.execute(select(REV, PROFIT).join(Sale).where(
        Sale.workspace_id == ws, Sale.created_at >= start, Sale.created_at < end)).one()
    return float(r[0]), float(r[1])


def pct(cur, prev):
    return round((cur - prev) / prev * 100, 1) if prev else 0.0


@router.get("/dashboard/summary")
def summary(db: Session = Depends(get_db), ws: int = Depends(current_workspace)):
    now = datetime.now()
    midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
    sales, profit = totals(db, ws, now - timedelta(days=7), now + timedelta(days=1))
    p_sales, p_profit = totals(db, ws, now - timedelta(days=14), now - timedelta(days=7))

    def orders(a, b):
        return db.scalar(select(func.count(Sale.id)).where(
            Sale.workspace_id == ws, Sale.created_at >= a, Sale.created_at < b))

    today, yesterday = orders(midnight, midnight + timedelta(days=1)), orders(midnight - timedelta(days=1), midnight)
    prods = db.scalars(select(Product).where(Product.workspace_id == ws)).all()
    return {
        "totalSales": sales, "grossProfit": profit,
        "salesChange": pct(sales, p_sales), "profitChange": pct(profit, p_profit),
        "ordersToday": today, "ordersChange": pct(today, yesterday),
        "itemsInStock": sum(p.stock_qty for p in prods),
        "needReview": sum(1 for p in prods if p.stock_qty <= p.reorder_level),
        "critical": sum(1 for p in prods if product_status(p.stock_qty, p.reorder_level) == "Critical"),
    }


@router.get("/dashboard/sales-trend")
def sales_trend(period: str = "week", db: Session = Depends(get_db), ws: int = Depends(current_workspace)):
    days = 7 if period == "week" else 30
    start = (datetime.now() - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    d = func.date(Sale.created_at)
    rows = db.execute(select(d, REV, PROFIT).join(Sale).where(
        Sale.workspace_id == ws, Sale.created_at >= start).group_by(d)).all()
    by_day = {r[0]: (float(r[1]), float(r[2])) for r in rows}
    out = []
    for i in range(days):
        day = (start + timedelta(days=i)).date()
        s, p = by_day.get(day, (0.0, 0.0))
        out.append({"day": day.strftime("%a" if days == 7 else "%b %d"), "sales": s, "profit": p})
    return out