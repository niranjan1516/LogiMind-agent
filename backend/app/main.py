from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import timezone, timedelta, datetime
from typing import List, Optional
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

# 1. Create DB tables automatically (This builds the Orders table if missing)
models.Base.metadata.create_all(bind=engine)

# Define IST offset
IST = timezone(timedelta(hours=5, minutes=30))

app = FastAPI(title="LogiMind OS API", version="1.0.0")

# 2. CORS MIDDLEWARE AT THE TOP
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
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
    driver_id: str
    deliveries: List[Location]

class OrderCreate(BaseModel):
    client_phone: str
    pickup_location: str
    drop_location: str
    weight_kg: float
    scheduled_time: datetime
    driver_id: Optional[str] = None


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
            "id": str(o.order_id)[:8].upper(), # Make it look like ORD-XXXX
            "destination": o.drop_location,
            "status": o.status,
            "eta": "Calculating..." # We will link this to the AI routing later
        })
    return formatted_orders

# --- EXISTING FUNCTIONAL ENDPOINTS ---

@app.get("/telemetry/{driver_id}/latest")
def get_latest_telemetry(driver_id: str, db: Session = Depends(get_db)):
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
def view_route_map(driver_id: str, db: Session = Depends(get_db)):
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