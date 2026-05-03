import json
import time
import random
from datetime import datetime, timezone
from confluent_kafka import Producer

# Connect to Kafka exposed on the host machine via docker-compose
KAFKA_BROKER = "localhost:29092"
TOPIC = "telemetry_gps"

producer = Producer({"bootstrap.servers": KAFKA_BROKER})

# Bounding box for Mumbai area (simulating Indian logistics routes)
LAT_MIN, LAT_MAX = 18.86, 19.30
LON_MIN, LON_MAX = 72.75, 73.15

def delivery_report(err, msg):
    """ Callback triggered by Kafka to confirm delivery """
    if err is not None:
        print(f"Message delivery failed: {err}")
    else:
        print(f"Delivered GPS Ping to {msg.topic()} [{msg.partition()}]")

def simulate_gps():
    # Placeholder UUID for testing; eventually this will map to actual driver IDs
    driver_id = "11111111-1111-1111-1111-111111111111" 
    print("Starting LogiMind GPS Telemetry Simulator...")
    print("Press Ctrl+C to stop.")
    
    try:
        while True:
            payload = {
                "time": datetime.now(timezone.utc).isoformat(),
                "driver_id": driver_id,
                "latitude": round(random.uniform(LAT_MIN, LAT_MAX), 6),
                "longitude": round(random.uniform(LON_MIN, LON_MAX), 6),
                "speed": round(random.uniform(10, 80), 2),  # km/h
                "heading": round(random.uniform(0, 360), 2) # degrees
            }
            
            producer.produce(
                TOPIC,
                key=driver_id,
                value=json.dumps(payload).encode('utf-8'),
                callback=delivery_report
            )
            producer.flush()
            
            # Simulate a GPS ping every 2 seconds
            time.sleep(2) 
            
    except KeyboardInterrupt:
        print("\nSimulation stopped safely.")

if __name__ == "__main__":
    simulate_gps()