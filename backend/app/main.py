from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from .database import get_db
from . import models
from datetime import timezone, timedelta

from pydantic import BaseModel
from typing import List
from .services.routing import optimize_routes

from fastapi.responses import HTMLResponse
from .services.mapping import generate_route_map
from .services.routing import optimize_routes
from .services.forecasting import generate_24h_forecast


# Define IST offset
IST = timezone(timedelta(hours=5, minutes=30))

app = FastAPI(title="LogiMind OS API", version="1.0.0")

@app.get("/")
def read_root():
    return {"status": "operational", "message": "LogiMind OS Backend is running"}

@app.get("/drivers")
def get_drivers(db: Session = Depends(get_db)):
    """Fetch all drivers registered in the fleet."""
    drivers = db.query(models.Driver).all()
    return drivers

@app.get("/telemetry/{driver_id}/latest")
def get_latest_telemetry(driver_id: str, db: Session = Depends(get_db)):
    """Fetch the most recent GPS ping for a specific driver."""
    telemetry = (
        db.query(models.VehicleTelemetry)
        .filter(models.VehicleTelemetry.driver_id == driver_id)
        .order_by(desc(models.VehicleTelemetry.time))
        .first()
    )
    
    if not telemetry:
        raise HTTPException(status_code=404, detail="No telemetry data found for this driver")
        
    # Convert the UTC time from DB to IST for the user
    ist_time = telemetry.time.astimezone(IST)
    
    return {
        "driver_id": telemetry.driver_id,
        "time": ist_time.strftime("%Y-%m-%d %H:%M:%S"),
        "latitude": telemetry.latitude,
        "longitude": telemetry.longitude,
        "speed": telemetry.speed,
        "heading": telemetry.heading
    }
    
# Pydantic models for incoming JSON request bodies
class Location(BaseModel):
    latitude: float
    longitude: float
    order_id: str

class RouteRequest(BaseModel):
    driver_id: str
    deliveries: List[Location]

@app.post("/optimize-route")
def calculate_optimal_route(request: RouteRequest, db: Session = Depends(get_db)):
    """
    Takes a driver's current location from TimescaleDB and a list of deliveries,
    then returns the most efficient route sequence using Google OR-Tools.
    """
    # 1. Fetch the driver's LIVE location
    telemetry = (
        db.query(models.VehicleTelemetry)
        .filter(models.VehicleTelemetry.driver_id == request.driver_id)
        .order_by(desc(models.VehicleTelemetry.time))
        .first()
    )
    
    if not telemetry:
        raise HTTPException(status_code=404, detail="No live telemetry found for this driver.")

    depot_location = {
        "latitude": telemetry.latitude,
        "longitude": telemetry.longitude
    }
    
    # 2. Format delivery locations
    delivery_locations = [
        {"latitude": d.latitude, "longitude": d.longitude, "order_id": d.order_id} 
        for d in request.deliveries
    ]

    # 3. Run the engine (calculating for 1 vehicle in this specific route request)
    result = optimize_routes(depot_location, delivery_locations, num_vehicles=1)
    
    return result

@app.get("/route-map/{driver_id}", response_class=HTMLResponse)
def view_route_map(driver_id: str, db: Session = Depends(get_db)):
    """Generates an interactive HTML map of the live optimized route."""
    
    # 1. Get live truck location
    telemetry = (
        db.query(models.VehicleTelemetry)
        .filter(models.VehicleTelemetry.driver_id == driver_id)
        .order_by(desc(models.VehicleTelemetry.time))
        .first()
    )
    
    if not telemetry:
        raise HTTPException(status_code=404, detail="No live telemetry found")

    depot = {"latitude": telemetry.latitude, "longitude": telemetry.longitude}
    
    # 2. Hardcoded test deliveries (Bandra, Thane, Colaba)
    deliveries = [
        {"latitude": 19.0760, "longitude": 72.8777, "order_id": "ORD-001-BANDRA"},
        {"latitude": 19.2183, "longitude": 72.9781, "order_id": "ORD-002-THANE"},
        {"latitude": 18.9220, "longitude": 72.8347, "order_id": "ORD-003-COLABA"}
    ]

    # 3. Calculate optimized route
    vrp_result = optimize_routes(depot, deliveries, num_vehicles=1)
    
    if "error" in vrp_result or not vrp_result.get("routes"):
        raise HTTPException(status_code=500, detail="Routing engine failed to find a path.")
        
    optimized_path = vrp_result["routes"][0]["optimized_path"]

    # 4. Generate and return the map
    html_map = generate_route_map(depot, optimized_path)
    return HTMLResponse(content=html_map)

@app.get("/forecast/{city}")
def get_demand_forecast(city: str):
    """
    Ask the AI: Predicts the hourly logistics order volume for the next 24 hours 
    using the trained LSTM neural network.
    """
    # Capitalize to match our dataset (e.g., "mumbai" -> "Mumbai")
    result = generate_24h_forecast(city.capitalize())
    
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
        
    return result