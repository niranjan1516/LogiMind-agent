import json
import os
import sys
from datetime import datetime
from confluent_kafka import Consumer, KafkaError

# Ensure the script can find the 'app' module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import VehicleTelemetry

KAFKA_BROKER = "localhost:29092"
TOPIC = "telemetry_gps"
GROUP_ID = "telemetry_ingestion_group"

consumer = Consumer({
    'bootstrap.servers': KAFKA_BROKER,
    'group.id': GROUP_ID,
    'auto.offset.reset': 'earliest'
})

consumer.subscribe([TOPIC])

def run_consumer():
    print(f"Starting LogiMind Telemetry Consumer...")
    print(f"Listening to topic '{TOPIC}'...")
    
    db = SessionLocal()
    
    try:
        while True:
            msg = consumer.poll(1.0) # Wait up to 1 second for a message
            
            if msg is None:
                continue
            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    continue
                else:
                    print(f"Consumer error: {msg.error()}")
                    continue
            
            # Parse the Kafka message
            payload = json.loads(msg.value().decode('utf-8'))
            
            # Create a database record
            telemetry_record = VehicleTelemetry(
                time=datetime.fromisoformat(payload["time"]),
                driver_id=payload["driver_id"],
                latitude=payload["latitude"],
                longitude=payload["longitude"],
                speed=payload["speed"],
                heading=payload["heading"]
            )
            
            # Save to TimescaleDB
            db.add(telemetry_record)
            db.commit()
            
            print(f"Ingested GPS data for driver {payload['driver_id']} at {payload['time']}")

    except KeyboardInterrupt:
        print("\nConsumer shutting down safely.")
    finally:
        consumer.close()
        db.close()

if __name__ == "__main__":
    run_consumer()