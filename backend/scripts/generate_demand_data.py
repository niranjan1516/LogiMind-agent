import pandas as pd
import numpy as np
import os
from datetime import datetime, timedelta

def create_national_historical_data(filepath="data/historical_demand.csv"):
    # Ensure the data directory exists
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    # Generate hourly timestamps for the last 180 days (6 months)
    end_date = datetime.now()
    start_date = end_date - timedelta(days=180)
    dates = pd.date_range(start=start_date, end=end_date, freq='h')
    
    # Tiered Indian Logistics Hubs mapped by State
    locations = [
        # Maharashtra
        {"state": "Maharashtra", "city": "Mumbai", "base": 800, "volatility": 60},
        {"state": "Maharashtra", "city": "Pune", "base": 350, "volatility": 25},
        {"state": "Maharashtra", "city": "Nagpur", "base": 200, "volatility": 15},
        {"state": "Maharashtra", "city": "Kolhapur", "base": 120, "volatility": 10},
        
        # Goa
        {"state": "Goa", "city": "Panaji", "base": 90, "volatility": 12},
        {"state": "Goa", "city": "Vasco da Gama", "base": 60, "volatility": 8},
        
        # Karnataka
        {"state": "Karnataka", "city": "Bengaluru", "base": 750, "volatility": 55},
        {"state": "Karnataka", "city": "Mysuru", "base": 180, "volatility": 15},
        {"state": "Karnataka", "city": "Mangaluru", "base": 140, "volatility": 12},
        
        # Gujarat
        {"state": "Gujarat", "city": "Ahmedabad", "base": 450, "volatility": 35},
        {"state": "Gujarat", "city": "Surat", "base": 380, "volatility": 30},
        {"state": "Gujarat", "city": "Vadodara", "base": 220, "volatility": 18},
        
        # Delhi / NCR
        {"state": "Delhi", "city": "New Delhi", "base": 850, "volatility": 70},
        
        # Tamil Nadu
        {"state": "Tamil Nadu", "city": "Chennai", "base": 500, "volatility": 40},
        {"state": "Tamil Nadu", "city": "Coimbatore", "base": 250, "volatility": 20},
        
        # Telangana
        {"state": "Telangana", "city": "Hyderabad", "base": 550, "volatility": 45},
        
        # West Bengal
        {"state": "West Bengal", "city": "Kolkata", "base": 400, "volatility": 30}
    ]
    
    records = []
    
    print(f"Simulating state-level data for {len(dates)} hours across {len(locations)} cities...")
    
    for loc in locations:
        state = loc["state"]
        city = loc["city"]
        base_volume = loc["base"]
        volatility = loc["volatility"]
            
        for dt in dates:
            # Time of day seasonality
            time_of_day = dt.hour
            if 10 <= time_of_day <= 13:     # Morning dispatch
                hour_factor = 1.5
            elif 17 <= time_of_day <= 21:   # Evening delivery peak
                hour_factor = 2.0
            elif 1 <= time_of_day <= 5:     # Dead of night
                hour_factor = 0.1
            else:
                hour_factor = 0.8
                
            # Weekly seasonality: Surge on weekends
            day_factor = 1.4 if dt.weekday() >= 5 else 1.0
            
            # Month-end salary spike
            month_factor = 1.1 if dt.day <= 5 or dt.day >= 28 else 1.0
            
            # Localized randomness
            noise = np.random.normal(0, volatility)
            
            # Calculate final volume
            volume = int(max(0, (base_volume * hour_factor * day_factor * month_factor) + noise))
            
            records.append({
                "timestamp": dt.strftime("%Y-%m-%d %H:00:00"),
                "state": state,
                "city": city,
                "order_volume": volume
            })
            
    df = pd.DataFrame(records)
    
    # Sort chronologically, then by state and city
    df.sort_values(by=["timestamp", "state", "city"], inplace=True)
    df.to_csv(filepath, index=False)
    
    print(f"Success! Generated {len(df)} regional records.")
    print(f"Dataset saved to: {os.path.abspath(filepath)}")

if __name__ == "__main__":
    create_national_historical_data()