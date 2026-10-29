from sqlalchemy.orm import Session

from app.db import repositories

DAY_OPTIONS = {7, 14, 30, 90}


def _days(value: object) -> int:
    if not isinstance(value, int) or value not in DAY_OPTIONS:
        raise ValueError("days must be one of 7, 14, 30, or 90")
    return value


def _limit(value: object) -> int:
    if not isinstance(value, int) or not 1 <= value <= 10:
        raise ValueError("limit must be between 1 and 10")
    return value


def get_sales_summary(db: Session, workspace_id: int, arguments: dict) -> dict:
    return repositories.sales_summary(db, workspace_id, _days(arguments.get("days", 7)))


def get_sales_trend(db: Session, workspace_id: int, arguments: dict) -> list[dict]:
    period = arguments.get("period", "week")
    if period not in {"week", "month"}:
        raise ValueError("period must be week or month")
    return repositories.sales_trend(db, workspace_id, period)


def get_top_products(db: Session, workspace_id: int, arguments: dict) -> list[dict]:
    return repositories.top_products(
        db, workspace_id, _days(arguments.get("days", 30)), _limit(arguments.get("limit", 5))
    )


def get_payment_breakdown(db: Session, workspace_id: int, arguments: dict) -> list[dict]:
    return repositories.payment_breakdown(db, workspace_id, _days(arguments.get("days", 30)))