from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, Float, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

class Order(Base):
    __tablename__ = "orders"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    customer_name: Mapped[str] = mapped_column(String(100))
    product_name: Mapped[str] = mapped_column(String(150))
    sku: Mapped[str] = mapped_column(String(40), index=True)
    category: Mapped[str] = mapped_column(String(60))
    size: Mapped[str] = mapped_column(String(20))
    price: Mapped[float] = mapped_column(Float)
    order_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    delivered: Mapped[bool] = mapped_column(default=True)

class Inventory(Base):
    __tablename__ = "inventory"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sku: Mapped[str] = mapped_column(String(40), index=True)
    size: Mapped[str] = mapped_column(String(20))
    available_qty: Mapped[int] = mapped_column(Integer, default=0)

class ReturnRequest(Base):
    __tablename__ = "return_requests"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    request_type: Mapped[str] = mapped_column(String(20))  # RETURN / EXCHANGE
    reason: Mapped[str] = mapped_column(String(60))
    comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    requested_size: Mapped[str | None] = mapped_column(String(20), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="REQUESTED")
    disposition: Mapped[str | None] = mapped_column(String(30), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    order: Mapped[Order] = relationship()
    history: Mapped[list["StatusHistory"]] = relationship(back_populates="request", cascade="all, delete-orphan")

class StatusHistory(Base):
    __tablename__ = "status_history"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("return_requests.id"))
    status: Mapped[str] = mapped_column(String(30))
    note: Mapped[str] = mapped_column(String(250), default="")
    changed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    request: Mapped[ReturnRequest] = relationship(back_populates="history")
