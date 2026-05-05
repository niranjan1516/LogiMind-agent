from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

# --- DRIVER SCHEMAS ---
class DriverCreate(BaseModel):
    name: str
    phone_number: str

class DriverResponse(BaseModel):
    driver_id: UUID
    name: str
    phone_number: str
    status: str
    efficiency_score: float

    class Config:
        from_attributes = True

# --- ORDER SCHEMAS ---
class OrderCreate(BaseModel):
    client_phone: str
    pickup_location: str
    drop_location: str
    weight_kg: float
    scheduled_time: datetime
    driver_id: Optional[UUID] = None

class OrderResponse(BaseModel):
    order_id: UUID
    client_phone: str
    pickup_location: str
    drop_location: str
    weight_kg: float
    scheduled_time: datetime
    status: str
    driver_id: Optional[UUID]

    class Config:
        from_attributes = True