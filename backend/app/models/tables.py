from datetime import date, datetime
from sqlalchemy import Date, DateTime, ForeignKey, Index, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base

Money = Numeric(12, 2)

class Workspace(Base):
    __tablename__ = "workspaces"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    currency: Mapped[str] = mapped_column(String(3), default="KES")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id"))
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(30), default="businessOwner")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

class Product(Base):
    __tablename__ = "products"
    id: Mapped[int] = mapped_column(primary_key=True)
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    category: Mapped[str] = mapped_column(String(60))
    sku: Mapped[str] = mapped_column(String(40))
    cost_price: Mapped[float] = mapped_column(Money)
    selling_price: Mapped[float] = mapped_column(Money)
    stock_qty: Mapped[int] = mapped_column(default=0)
    reorder_level: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    @property
    def code(self) -> str:          # BP-1001 style id the UI expects
        return f"BP-{1000 + self.id}"

class Sale(Base):
    __tablename__ = "sales"
    __table_args__ = (Index("ix_sales_ws_created", "workspace_id", "created_at"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id"))
    ref: Mapped[str] = mapped_column(String(20), unique=True)      # TX-8432
    customer_name: Mapped[str] = mapped_column(String(120), default="Walk-in customer")
    payment_method: Mapped[str] = mapped_column(String(20))        # M-Pesa / Cash / Credit
    status: Mapped[str] = mapped_column(String(20), default="Completed")
    total: Mapped[float] = mapped_column(Money, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    items: Mapped[list["SaleItem"]] = relationship(back_populates="sale", cascade="all, delete-orphan")

class SaleItem(Base):
    __tablename__ = "sale_items"
    id: Mapped[int] = mapped_column(primary_key=True)
    sale_id: Mapped[int] = mapped_column(ForeignKey("sales.id"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    qty: Mapped[int]
    unit_price: Mapped[float] = mapped_column(Money)
    unit_cost: Mapped[float] = mapped_column(Money)   # cost at time of sale, so profit stays correct
    sale: Mapped[Sale] = relationship(back_populates="items")
    product: Mapped[Product] = relationship()

class Expense(Base):
    __tablename__ = "expenses"
    id: Mapped[int] = mapped_column(primary_key=True)
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id"), index=True)
    category: Mapped[str] = mapped_column(String(60))
    amount: Mapped[float] = mapped_column(Money)
    spent_on: Mapped[date] = mapped_column(Date)

class Recommendation(Base):
    __tablename__ = "recommendations"
    id: Mapped[int] = mapped_column(primary_key=True)
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id"), index=True)
    agent: Mapped[str] = mapped_column(String(40))
    insight: Mapped[str]
    cause: Mapped[str | None]
    recommendation: Mapped[str]
    evidence: Mapped[list] = mapped_column(JSONB, default=list)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())