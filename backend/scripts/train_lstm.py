import os
import sys
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
import joblib

# Suppress annoying TensorFlow CPU warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout

# Configuration
CITY_TO_TRAIN = "Mumbai"
DATA_PATH = "data/historical_demand.csv"
MODEL_DIR = "models"
LOOKBACK_HOURS = 24 # Use the last 24 hours to predict the next hour

def prepare_data(df, lookback):
    """Converts a flat array into overlapping sequences for the LSTM."""
    X, y = [], []
    for i in range(len(df) - lookback):
        X.append(df[i:(i + lookback), 0])
        y.append(df[i + lookback, 0])
    return np.array(X), np.array(y)

def train_city_model():
    print(f"--- Starting LSTM Training for {CITY_TO_TRAIN} ---")
    
    # 1. Load Data
    if not os.path.exists(DATA_PATH):
        print(f"Error: Could not find dataset at {DATA_PATH}")
        sys.exit(1)
        
    df = pd.read_csv(DATA_PATH)
    
    # Filter for our specific city and grab the order volume
    city_df = df[df['city'] == CITY_TO_TRAIN].copy()
    volumes = city_df['order_volume'].values.reshape(-1, 1)
    
    print(f"Loaded {len(volumes)} hours of historical data for {CITY_TO_TRAIN}.")

    # 2. Scale Data (Neural Networks hate large numbers; we scale everything between 0 and 1)
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_volumes = scaler.fit_transform(volumes)

    # 3. Create Sequences
    X, y = prepare_data(scaled_volumes, LOOKBACK_HOURS)
    
    # Keras expects 3D input for LSTMs: [samples, time steps, features]
    X = np.reshape(X, (X.shape[0], X.shape[1], 1))
    
    print(f"Created {len(X)} training sequences.")

    # 4. Build the LSTM Architecture
    print("Building Neural Network Architecture...")
    model = Sequential([
        LSTM(50, return_sequences=True, input_shape=(LOOKBACK_HOURS, 1)),
        Dropout(0.2), # Prevents overfitting
        LSTM(50, return_sequences=False),
        Dropout(0.2),
        Dense(25),
        Dense(1) # Output layer: a single predicted volume
    ])

    model.compile(optimizer='adam', loss='mean_squared_error')

    # 5. Train the Model
    print("Beginning Training (this may take a minute or two on CPU)...")
    model.fit(X, y, batch_size=32, epochs=5, verbose=1)

    # 6. Save the Brain and the Scaler
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    model_path = os.path.join(MODEL_DIR, f"lstm_{CITY_TO_TRAIN.lower()}.keras")
    scaler_path = os.path.join(MODEL_DIR, f"scaler_{CITY_TO_TRAIN.lower()}.pkl")
    
    model.save(model_path)
    joblib.dump(scaler, scaler_path)
    
    print(f"\nSuccess! Model saved to {model_path}")
    print(f"Scaler saved to {scaler_path}")

if __name__ == "__main__":
    train_city_model()