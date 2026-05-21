import  { useState, useEffect } from 'react';
import axios from 'axios';
// Import your chart components (like Chart.js or Recharts) here

const DemandChart = () => {
  // 1. Create a state variable for the city, defaulting to Mumbai
  const [selectedCity, setSelectedCity] = useState("Mumbai");
  const [forecastData, setForecastData] = useState(null);
  const [error, setError] = useState(false);

  // 2. Add selectedCity to the dependency array so it refetches when changed
  useEffect(() => {
    const fetchForecast = async () => {
      try {
        // 3. Use template literals (backticks) to insert the dynamic city variable
        const response = await axios.get(`https://logimind-api.onrender.com/forecast/${selectedCity}`);
        setForecastData(response.data);
        setError(false);
      } catch (err) {
        console.error("Error fetching forecast:", err);
        setError(true);
      }
    };

    fetchForecast();
  }, [selectedCity]); // <--- This tells React to run the effect again if the city changes

  // 4. Create a handler function for when the user picks a new city
  const handleCityChange = (event) => {
    setSelectedCity(event.target.value);
  };

  return (
    <div className="p-4 bg-white rounded shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Demand Forecast</h2>
        
        {/* 5. Add a dropdown menu to select the city */}
        <select 
          value={selectedCity} 
          onChange={handleCityChange}
          className="border p-2 rounded"
        >
          <option value="Mumbai">Mumbai</option>
          <option value="Pune">Pune</option>
          <option value="Kolhapur">Kolhapur</option>
          <option value="Goa">Goa</option>
          {/* Add more cities as needed */}
        </select>
      </div>

      {/* Render your chart or error state here */}
      {error ? (
        <p className="text-red-500">Failed to load data for {selectedCity}.</p>
      ) : forecastData ? (
        <div>
           {/* Your Chart Component goes here using forecastData */}
           <p>Data loaded successfully for {selectedCity}!</p>
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default DemandChart;