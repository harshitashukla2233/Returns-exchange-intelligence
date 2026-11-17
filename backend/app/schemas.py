from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class ReturnCreate(BaseModel):
    order_id: int
    request_type: str = Field(pattern="^(RETURN|EXCHANGE)$")
    reason: str
    comments: str | None = None
    requested_size: str | None = None

class StatusUpdate(BaseModel):
    status: str
    note: str = ""

class InspectionCreate(BaseModel):
    disposition: str = Field(pattern="^(RESTOCK|REFUND|EXCHANGE|REJECT)$")
    note: str = ""
    requested_size: str | None = None

class ReturnOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    order_id: int
    request_type: str
    reason: str
    comments: str | None
    requested_size: str | None
    status: str
    disposition: str | None
    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None

class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    customer_name: str
    product_name: str
    sku: str
    category: str
    size: str
    price: float
    delivered: bool

class InventoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    sku: str
    size: str
    available_qty: int
