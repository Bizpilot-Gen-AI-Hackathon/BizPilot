from sqlalchemy.orm import Session

from app.db import repositories


def get_inventory_summary(db: Session, workspace_id: int, arguments: dict) -> dict:
    limit = arguments.get("limit", 5)
    if not isinstance(limit, int) or not 1 <= limit <= 10:
        raise ValueError("limit must be between 1 and 10")
    return repositories.inventory_summary(db, workspace_id, limit)