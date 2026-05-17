from fastapi import FastAPI, Depends, HTTPException, WebSocket
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from datetime import timezone, timedelta, datetime
from typing import List, Optional
from uuid import UUID
import os
import re
import time
import math

from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from .database import get_db, engine
from . import models
from .services.mapping import generate_route_map
from .services.routing import optimize_routes
from .services.forecasting import generate_24h_forecast
from fastapi import WebSocketDisconnect
from .websocket_manager import manager

if os.getenv("AUTO_CREATE_TABLES", "true").lower() == "true":
    models.Base.metadata.create_all(bind=engine)

# Define IST offset
IST = timezone(timedelta(hours=5, minutes=30))
DEV_DRIVER_OTP = os.getenv("DEV_DRIVER_OTP", "1234")
ORDER_STATUS_TRANSITIONS = {
    "PENDING": {"ACCEPTED"},
    "ACCEPTED": {"ARRIVED_AT_PICKUP"},
    "ARRIVED_AT_PICKUP": {"CARGO_LOADED"},
    "CARGO_LOADED": {"DELIVERED"},
    "DELIVERED": set(),
}

def normalize_phone_number(phone_number: str) -> str:
    digits = re.sub(r"\D", "", phone_number)
    if len(digits) == 12 and digits.startswith("91"):
        return digits[2:]
    return digits

app = FastAPI(title="LogiMind OS API", version="1.0.0")

DEFAULT_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://10.149.219.200:8081",
]
allowed_origins = [
    origin.strip()
    for origin in os.getenv("BACKEND_CORS_ORIGINS", ",".join(DEFAULT_CORS_ORIGINS)).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# PYDANTIC SCHEMAS (Data Validation)
# ==========================================
class Location(BaseModel):
    latitude: float
    longitude: float
    order_id: str

class RouteRequest(BaseModel):
    driver_id: UUID
    deliveries: List[Location]

class OrderCreate(BaseModel):
    client_phone: str
    pickup_location: str
    drop_location: str
    weight_kg: float
    scheduled_time: datetime
    driver_id: Optional[UUID] = None

class DriverLogin(BaseModel):
    phone_number: str
    otp: Optional[str] = None  # Add this

class StatusUpdate(BaseModel):
    status: str

# Add this schema near your others
class TelemetryUpdate(BaseModel):
    driver_id: UUID
    latitude: float
    longitude: float
    speed: Optional[float] = 0.0
    heading: Optional[float] = 0.0
    
    
# ==========================================
# ENDPOINTS
# ==========================================

@app.get("/")
def read_root():
    return {"status": "operational", "message": "LogiMind OS Backend is running"}

@app.get("/drivers")
def get_drivers(db: Session = Depends(get_db)):
    """Fetch all drivers registered in the fleet."""
    drivers = db.query(models.Driver).all()
    return drivers

# --- NEW: REAL DISPATCH ENDPOINTS ---

@app.post("/orders")
def create_order(order: OrderCreate, db: Session = Depends(get_db)):
    """Create a real order and save it to the PostgreSQL database."""
    if order.driver_id:
        driver = db.query(models.Driver).filter(models.Driver.driver_id == order.driver_id).first()
        if not driver:
            raise HTTPException(status_code=400, detail="Assigned driver does not exist")

    new_order = models.Order(
        client_phone=order.client_phone,
        pickup_location=order.pickup_location,
        drop_location=order.drop_location,
        weight_kg=order.weight_kg,
        scheduled_time=order.scheduled_time,
        driver_id=order.driver_id,
        status="PENDING"
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    return new_order

@app.get("/orders/active")
def get_active_orders(db: Session = Depends(get_db)):
    """Returns the real list of active deliveries directly from the DB."""
    orders = db.query(models.Order).filter(models.Order.status != "DELIVERED").all()
    
    # We format this so your existing React dashboard UI doesn't break
    formatted_orders = []
    for o in orders:
        formatted_orders.append({
            "order_id": str(o.order_id),
            "id": str(o.order_id)[:8].upper(),
            "destination": o.drop_location,
            "status": o.status,
            "eta": "Calculating..."
        })
    return formatted_orders

# --- EXISTING FUNCTIONAL ENDPOINTS ---

@app.get("/telemetry/{driver_id}/latest")
def get_latest_telemetry(driver_id: UUID, db: Session = Depends(get_db)):
    telemetry = (
        db.query(models.VehicleTelemetry)
        .filter(models.VehicleTelemetry.driver_id == driver_id)
        .order_by(desc(models.VehicleTelemetry.time))
        .first()
    )
    if not telemetry:
        raise HTTPException(status_code=404, detail="No telemetry data found for this driver")
    
    ist_time = telemetry.time.astimezone(IST)
    return {
        "driver_id": telemetry.driver_id,
        "time": ist_time.strftime("%Y-%m-%d %H:%M:%S"),
        "latitude": telemetry.latitude,
        "longitude": telemetry.longitude,
        "speed": telemetry.speed,
        "heading": telemetry.heading
    }

@app.post("/optimize-route")
def calculate_optimal_route(request: RouteRequest, db: Session = Depends(get_db)):
    telemetry = (
        db.query(models.VehicleTelemetry)
        .filter(models.VehicleTelemetry.driver_id == request.driver_id)
        .order_by(desc(models.VehicleTelemetry.time))
        .first()
    )
    if not telemetry:
        raise HTTPException(status_code=404, detail="No live telemetry found for this driver.")

    depot_location = {"latitude": telemetry.latitude, "longitude": telemetry.longitude}
    delivery_locations = [{"latitude": d.latitude, "longitude": d.longitude, "order_id": d.order_id} for d in request.deliveries]
    result = optimize_routes(depot_location, delivery_locations, num_vehicles=1)
    return result

@app.get("/route-map/{driver_id}", response_class=HTMLResponse)
def view_route_map(driver_id: UUID, db: Session = Depends(get_db)):
    telemetry = (
        db.query(models.VehicleTelemetry)
        .filter(models.VehicleTelemetry.driver_id == driver_id)
        .order_by(desc(models.VehicleTelemetry.time))
        .first()
    )
    if not telemetry:
        raise HTTPException(status_code=404, detail="No live telemetry found")

    depot = {"latitude": telemetry.latitude, "longitude": telemetry.longitude}
    deliveries = [
        {"latitude": 19.0760, "longitude": 72.8777, "order_id": "ORD-001-BANDRA"},
        {"latitude": 19.2183, "longitude": 72.9781, "order_id": "ORD-002-THANE"},
        {"latitude": 18.9220, "longitude": 72.8347, "order_id": "ORD-003-COLABA"}
    ]
    vrp_result = optimize_routes(depot, deliveries, num_vehicles=1)
    if "error" in vrp_result or not vrp_result.get("routes"):
        raise HTTPException(status_code=500, detail="Routing engine failed to find a path.")
        
    optimized_path = vrp_result["routes"][0]["optimized_path"]
    html_map = generate_route_map(depot, optimized_path)
    return HTMLResponse(content=html_map)

@app.get("/forecast/{city}")
def get_demand_forecast(city: str):
    result = generate_24h_forecast(city.capitalize())
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result

@app.get("/fleet/live")
def get_live_fleet():
    t = time.time() / 50 
    lat = 19.0760 + (math.sin(t) * 0.02)
    lon = 72.8777 + (math.cos(t) * 0.02)
    return {
        "id": "TRK-9021",
        "location": [lat, lon],
        "status": "En Route to Bandra",
        "speed": f"{int(40 + (math.sin(t)*10))} km/h"
    }

# ==========================================
# MOBILE APP ENDPOINTS
# ==========================================

@app.post("/driver/login")
def driver_login(login_data: DriverLogin, db: Session = Depends(get_db)):
    """Mobile App: Driver enters phone number to log in."""
    normalized_phone = normalize_phone_number(login_data.phone_number)
    driver = db.query(models.Driver).filter(models.Driver.phone_number == normalized_phone).first()
    
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found. Please contact Dispatch.")
    
    if login_data.otp != DEV_DRIVER_OTP:
        raise HTTPException(status_code=401, detail="Invalid OTP code.")
    
    return {
        "message": "Login successful", 
        "driver_id": str(driver.driver_id), 
        "name": driver.name
    }

@app.get("/driver/{driver_id}/active-order")
def get_driver_active_order(driver_id: UUID, db: Session = Depends(get_db)):
    """Mobile App: Fetch the current active route assigned to this driver."""
    order = db.query(models.Order).filter(
        models.Order.driver_id == driver_id,
        models.Order.status != "DELIVERED"
    ).first()
    
    if not order:
        return {"has_order": False, "order": None}
        
    return {
        "has_order": True,
        "order": {
            "order_id": str(order.order_id),
            "client_phone": order.client_phone,
            "pickup_location": order.pickup_location,
            "drop_location": order.drop_location,
            "weight_kg": order.weight_kg,
            "status": order.status
        }
    }

@app.put("/orders/{order_id}/status")
def update_order_status(order_id: UUID, status_update: StatusUpdate, db: Session = Depends(get_db)):
    """Mobile App: Driver updates the status of their current route based on LogiMind Spec."""
    order = db.query(models.Order).filter(models.Order.order_id == order_id).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    valid_statuses = set(ORDER_STATUS_TRANSITIONS.keys())
    if status_update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {sorted(valid_statuses)}")

    allowed_next_statuses = ORDER_STATUS_TRANSITIONS.get(order.status, set())
    if status_update.status not in allowed_next_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid transition from {order.status} to {status_update.status}"
        )
        
    order.status = status_update.status
    db.commit()
    db.refresh(order)
    
    return {"message": f"Order status updated to {order.status}", "new_status": order.status}

@app.post("/telemetry")
def update_telemetry(data: TelemetryUpdate, db: Session = Depends(get_db)):
    """Phase 2.3: Receiver for live GPS pings from the Mobile App."""
    new_ping = models.VehicleTelemetry(
        driver_id=data.driver_id,
        latitude=data.latitude,
        longitude=data.longitude,
        speed=data.speed,
        heading=data.heading,
        time=datetime.now(timezone.utc) # TimescaleDB handles the indexing
    )
    db.add(new_ping)
    db.commit()
    return {"status": "recorded"}

@app.get("/fleet/live-telemetry")
def get_live_fleet_telemetry(db: Session = Depends(get_db)):
    """Fetches the absolute latest GPS ping for every active driver."""
    # This SQL query gets the most recent telemetry row per driver
    subquery = db.query(
        models.VehicleTelemetry.driver_id,
        func.max(models.VehicleTelemetry.time).label('max_time')
    ).group_by(models.VehicleTelemetry.driver_id).subquery()

    latest_pings = db.query(models.VehicleTelemetry).join(
        subquery,
        (models.VehicleTelemetry.driver_id == subquery.c.driver_id) &
        (models.VehicleTelemetry.time == subquery.c.max_time)
    ).all()

    fleet_data = []
    for ping in latest_pings:
        # Only show trucks that have pinged in the last 5 minutes (300 seconds)
        time_diff = (datetime.now(timezone.utc) - ping.time).total_seconds()
        if time_diff < 300:
            fleet_data.append({
                "driver_id": ping.driver_id,
                "latitude": ping.latitude,
                "longitude": ping.longitude,
                "speed": ping.speed,
                "last_ping": ping.time.strftime("%H:%M:%S")
            })
            
    return fleet_data

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            # Wait for data from the mobile app (e.g., location updates)
            data = await websocket.receive_json()
            
            # 1. Update the Database (Optimized in our last step!)
            # 2. Broadcast to the Dashboard Live Map
            await manager.broadcast({
                "driver_id": client_id,
                "lat": data['lat'],
                "lng": data['lng'],
                "status": "online"
            })
    except WebSocketDisconnect:
        manager.disconnect(client_id)
        await manager.broadcast({"driver_id": client_id, "status": "offline"})