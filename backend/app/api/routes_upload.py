import csv
import io
import re
import secrets
from datetime import datetime
from decimal import Decimal, InvalidOperation

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_workspace
from app.db.database import get_db
from app.models.tables import Product, Sale, SaleItem
from app.ratelimit import limit

router = APIRouter(tags=["upload"])

MAX_BYTES = 5 * 1024 * 1024
MAX_ROWS = 5000

ALIASES = {
    "name": "name", "product": "name", "product_name": "name", "item": "name", "item_name": "name",
    "category": "category", "sku": "sku", "code": "sku",
    "price": "price", "selling_price": "price", "unit_price": "price", "sale_price": "price",
    "cost": "cost", "cost_price": "cost", "buying_price": "cost", "unit_cost": "cost",
    "stock": "stock", "stock_qty": "stock", "in_stock": "stock", "current_stock": "stock", "opening_stock": "stock",
    "reorder_level": "reorder", "reorder_at": "reorder", "reorder_point": "reorder", "min_stock": "reorder",
    "qty": "qty", "quantity": "qty", "units": "qty", "units_sold": "qty",
    "date": "date", "datetime": "date", "sold_at": "date",
    "payment": "method", "payment_method": "method", "method": "method",
    "customer": "customer", "customer_name": "customer",
}

TEMPLATES = {
    "products": "name,category,sku,cost,price,stock,reorder_level\n"
                "Maize Flour 2kg,Groceries,GR-2048,125,165,40,25\n"
                "Bottled Water 1L,Beverages,BV-1000,35,50,60,24\n",
    "sales": "product,qty,price,date,payment_method,customer\n"
             "Maize Flour 2kg,2,165,2026-10-20 09:30,M-Pesa,Walk-in customer\n"
             "Bottled Water 1L,6,50,2026-10-20 11:15,Cash,Mary Wanjiku\n",
}

DATE_FORMATS = ["%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d", "%d/%m/%Y %H:%M",
                "%d/%m/%Y", "%d-%m-%Y", "%d/%m/%y"]


def norm(h: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", h.strip().lower()).strip("_")


def money(v) -> Decimal | None:
    s = re.sub(r"(?i)kes|ksh|\s|,", "", str(v or ""))
    if not s:
        return None
    try:
        d = Decimal(s)
    except InvalidOperation:
        raise ValueError(f"'{v}' is not a number")
    if d < 0:
        raise ValueError("amounts can't be negative")
    return d.quantize(Decimal("0.01"))


def whole(v) -> int | None:
    d = money(v)
    return None if d is None else int(d)


def parse_date(v) -> datetime:
    s = str(v or "").strip()
    if not s:
        return datetime.now()
    try:
        return datetime.fromisoformat(s).replace(tzinfo=None)
    except ValueError:
        pass
    for f in DATE_FORMATS:
        try:
            return datetime.strptime(s, f)
        except ValueError:
            continue
    raise ValueError(f"'{v}' isn't a date. Use YYYY-MM-DD or DD/MM/YYYY")


def payment(v) -> str:
    s = re.sub(r"[^a-z]", "", str(v or "").lower())
    return {"mpesa": "M-Pesa", "cash": "Cash", "credit": "Credit"}.get(s, (str(v).strip().title() if s else "Cash"))


def read_rows(raw: bytes):
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("latin-1")
    try:
        dialect = csv.Sniffer().sniff(text[:2048], delimiters=",;\t")
    except csv.Error:
        dialect = csv.excel
    reader = csv.reader(io.StringIO(text), dialect)
    rows = []
    for row in reader:
        if any(c.strip() for c in row):
            rows.append((reader.line_num, [c.strip() for c in row]))
    if len(rows) < 2:
        raise HTTPException(400, "The file needs a header row and at least one data row.")
    if len(rows) - 1 > MAX_ROWS:
        raise HTTPException(400, f"Too many rows. The limit is {MAX_ROWS} per file.")
    headers = [ALIASES.get(norm(h), norm(h)) for h in rows[0][1]]
    return headers, rows[1:]


def detect_kind(headers: list[str]) -> str:
    h = set(headers)
    if "qty" in h and not (h & {"stock", "reorder", "cost"}):
        return "sales"
    if "name" in h and "price" in h:
        return "products"
    raise HTTPException(400, "Couldn't tell what this file contains. Download a template to see the columns.")


def import_products(db: Session, ws: int, headers, rows):
    by_name = {p.name.lower(): p for p in db.scalars(select(Product).where(Product.workspace_id == ws))}
    by_sku = {p.sku.lower(): p for p in by_name.values() if p.sku}
    created = updated = 0
    errors = []
    for line, row in rows:
        d = dict(zip(headers, row))
        try:
            name = d.get("name", "")
            if not name:
                raise ValueError("missing product name")
            price, cost = money(d.get("price")), money(d.get("cost"))
            stock, reorder = whole(d.get("stock")), whole(d.get("reorder"))
            sku = d.get("sku") or None
            p = (by_sku.get(sku.lower()) if sku else None) or by_name.get(name.lower())
            if p:
                p.name = name
                if price is not None: p.selling_price = price
                if cost is not None: p.cost_price = cost
                if stock is not None: p.stock_qty = stock
                if reorder is not None: p.reorder_level = reorder
                if d.get("category"): p.category = d["category"]
                updated += 1
            else:
                if price is None:
                    raise ValueError("missing selling price")
                if cost is None:
                    raise ValueError("missing cost price (needed to work out profit)")
                p = Product(workspace_id=ws, name=name, category=d.get("category") or "General",
                            sku=(sku or f"SKU-{secrets.token_hex(3).upper()}")[:40],
                            cost_price=cost, selling_price=price,
                            stock_qty=stock or 0, reorder_level=reorder if reorder is not None else 10)
                db.add(p)
                by_name[name.lower()] = p
                if sku: by_sku[sku.lower()] = p
                created += 1
        except ValueError as e:
            errors.append({"line": line, "message": str(e)})
    return created, updated, errors


def import_sales(db: Session, ws: int, headers, rows, adjust_stock: bool):
    by_name = {p.name.lower(): p for p in db.scalars(select(Product).where(Product.workspace_id == ws))}
    by_sku = {p.sku.lower(): p for p in by_name.values() if p.sku}
    created = 0
    errors = []
    for line, row in rows:
        d = dict(zip(headers, row))
        try:
            ref_name = d.get("name", "")
            p = by_name.get(ref_name.lower()) or by_sku.get(ref_name.lower())
            if not p:
                raise ValueError(f"unknown product '{ref_name}'. Import your products first")
            qty = whole(d.get("qty"))
            if not qty or qty < 1:
                raise ValueError("quantity must be 1 or more")
            price = money(d.get("price"))
            price = price if price is not None else p.selling_price
            method = payment(d.get("method"))
            sale = Sale(workspace_id=ws, ref=f"IM-{secrets.token_hex(4).upper()}",
                        customer_name=d.get("customer") or "Walk-in customer",
                        payment_method=method, status="Pending" if method == "Credit" else "Completed",
                        total=price * qty, created_at=parse_date(d.get("date")))
            sale.items.append(SaleItem(product_id=p.id, qty=qty, unit_price=price, unit_cost=p.cost_price))
            db.add(sale)
            if adjust_stock:
                p.stock_qty = max(0, p.stock_qty - qty)
            created += 1
        except ValueError as e:
            errors.append({"line": line, "message": str(e)})
    return created, 0, errors


@router.get("/upload/template")
def template(kind: str = Query("products", pattern="^(products|sales)$")):
    return Response(TEMPLATES[kind], media_type="text/csv",
                    headers={"Content-Disposition": f'attachment; filename="bizpilot-{kind}-template.csv"'})


@router.post("/upload", dependencies=[Depends(limit("upload", 20, 600))])
async def upload(file: UploadFile = File(...),
                 kind: str | None = Query(None, pattern="^(products|sales)$"),
                 preview: bool = False,
                 adjust_stock: bool = False,
                 db: Session = Depends(get_db),
                 ws: int = Depends(require_workspace)):
    if not (file.filename or "").lower().endswith((".csv", ".txt")):
        raise HTTPException(400, "Please upload a .csv file. In Excel: File > Save As > CSV.")
    raw = await file.read(MAX_BYTES + 1)
    if len(raw) > MAX_BYTES:
        raise HTTPException(413, "That file is larger than 5 MB.")
    headers, rows = read_rows(raw)
    kind = kind or detect_kind(headers)
    if kind == "products":
        if "name" not in headers or "price" not in headers:
            raise HTTPException(400, "A products file needs 'name' and 'price' columns.")
        created, updated, errors = import_products(db, ws, headers, rows)
    else:
        if "name" not in headers or "qty" not in headers:
            raise HTTPException(400, "A sales file needs 'product' and 'qty' columns.")
        db.flush()
        created, updated, errors = import_sales(db, ws, headers, rows, adjust_stock)
    db.rollback() if preview else db.commit()
    return {"kind": kind, "imported": created, "updated": updated,
            "skipped": len(errors), "errors": errors[:20], "preview": preview}