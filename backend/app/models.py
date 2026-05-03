from sqlalchemy import Column, String, Float, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .database import Base

class Driver(Base):
    __tablename__ = "drivers"
    
    driver_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    name = Column(String(100), nullable=False)
    phone_number = Column(String(20), unique=True, nullable=False)
    status = Column(String(20), default="AVAILABLE")
    efficiency_score = Column(Float, default=100.0)
    # Added timezone=True to match TIMESTAMPTZ
    created_at = Column(DateTime(timezone=True), server_default=text("NOW()"))
    
    # Establish a relationship so you can easily access a driver's telemetry history via ORM
    telemetry = relationship("VehicleTelemetry", back_populates="driver")


class VehicleTelemetry(Base):
    __tablename__ = "vehicle_telemetry"
    
    # SQLAlchemy requires a primary key, so we use a composite key of time + driver_id
    # which works perfectly for TimescaleDB hypertables.
    time = Column(DateTime(timezone=True), primary_key=True)
    
    # Added ForeignKey to link back to the drivers table
    driver_id = Column(UUID(as_uuid=True), ForeignKey('drivers.driver_id'), primary_key=True)
    
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    speed = Column(Float)
    heading = Column(Float)
    
    # Relationship to access the driver object directly from a telemetry ping
    driver = relationship("Driver", back_populates="telemetry")