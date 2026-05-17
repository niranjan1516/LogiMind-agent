import os
import sys
from uuid import UUID

# Ensure script can find the 'app' module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import Driver

def seed_test_driver():
    db = SessionLocal()
    test_uuid = UUID("11111111-1111-1111-1111-111111111113")
    
    # Check if driver already exists
    exists = db.query(Driver).filter(Driver.driver_id == test_uuid).first()
    
    if not exists:
        print(f"Seeding test driver with ID: {test_uuid}")
        new_driver = Driver(
            driver_id=test_uuid,
            name="Niranjan",
            phone_number="7709561516",
            status="AVAILABLE"
        )
        db.add(new_driver)
        db.commit()
        print("Driver seeded successfully.")
    else:
        print("Test driver already exists in database.")
    
    db.close()

if __name__ == "__main__":
    seed_test_driver()