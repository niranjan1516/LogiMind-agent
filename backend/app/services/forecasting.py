import os
import numpy as np
import pandas as pd
import joblib
from tensorflow.keras.models import load_model

# BULLETPROOF PATHING: Get the absolute path to the 'backend' folder
# This ensures it works whether you run from root or from the backend folder
current_dir = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.abspath(os.path.join(current_dir, "../../"))
MODELS_DIR = os.path.join(BASE_DIR, "models")
DATA_PATH = os.path.join(BASE_DIR, "data", "historical_demand.csv")

def generate_24h_forecast(city: str):
    """
    Loads the trained LSTM model for a specific city, grabs the last 24 hours 
    of data as a seed, and predicts the order volume for the next 24 hours.
    """
    model_path = os.path.join(MODELS_DIR, f"lstm_{city.lower()}.keras")
    scaler_path = os.path.join(MODELS_DIR, f"scaler_{city.lower()}.pkl")
    
    if not os.path.exists(model_path) or not os.path.exists(scaler_path):
        return {"error": f"AI Brain for {city} not found. Please run the training script first."}
        
    # 1. Load the Brain and the Scaler
    model = load_model(model_path)
    scaler = joblib.load(scaler_path)
    
    # 2. Get the latest 24 hours of data to use as our "seed"
    df = pd.read_csv(DATA_PATH)
    city_df = df[df['city'] == city].tail(24) # Grab exactly the last 24 hours
    
    if len(city_df) < 24:
        return {"error": "Not enough historical data to generate a forecast."}
        
    last_24_volumes = city_df['order_volume'].values.reshape(-1, 1)
    
    # Scale the real-world numbers down to [0,1] for the neural network
    scaled_input = scaler.transform(last_24_volumes)
    
    # Reshape for LSTM: [samples, time steps, features] -> (1, 24, 1)
    current_sequence = scaled_input.reshape((1, 24, 1))
    
    predictions = []
    
    # 3. Autoregressive Loop: Predict next 24 hours
    for _ in range(24):
        # Predict the next hour (returns a scaled value like 0.85)
        next_hour_scaled = model.predict(current_sequence, verbose=0)
        
        # Convert back to real-world volume (e.g., 0.85 -> 850 orders)
        next_hour_volume = scaler.inverse_transform(next_hour_scaled)[0][0]
        # Change this line in your loop:
        predictions.append(int(next_hour_volume)) # Ensure no negative orders
        
        # Update the sequence: Drop the oldest hour, append the new prediction
        next_hour_reshaped = next_hour_scaled.reshape(1, 1, 1)
        current_sequence = np.append(current_sequence[:, 1:, :], next_hour_reshaped, axis=1)
        
    # 4. Generate Future Timestamps
    last_time = pd.to_datetime(city_df.iloc[-1]['timestamp'])
    forecast_data = []
    
    for i in range(24):
        future_time = last_time + pd.Timedelta(hours=i+1)
        forecast_data.append({
            "timestamp": future_time.strftime("%Y-%m-%d %H:00:00"),
            "predicted_volume": predictions[i]
        })
        
    return {
        "status": "success",
        "city": city,
        "forecast": forecast_data
    }