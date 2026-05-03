-- Enable TimescaleDB extension for time-series data
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Table for Drivers
CREATE TABLE IF NOT EXISTS drivers (
    driver_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'AVAILABLE', -- AVAILABLE, EN_ROUTE, OFF_DUTY
    efficiency_score FLOAT DEFAULT 100.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for Vehicle Telemetry (High Volume Time-Series Data)
CREATE TABLE IF NOT EXISTS vehicle_telemetry (
    time TIMESTAMPTZ NOT NULL,
    driver_id UUID REFERENCES drivers(driver_id),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed FLOAT,
    heading FLOAT
);

-- Convert standard table into a TimescaleDB Hypertable partitioned by time
SELECT create_hypertable('vehicle_telemetry', 'time');