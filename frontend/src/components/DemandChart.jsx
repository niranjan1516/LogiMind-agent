import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { API_BASE_URL } from '../lib/api';

const DemandChart = ({ city }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForecast = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/forecast/${city}`);

        // Safely check if the forecast array exists
        if (response.data && response.data.forecast) {
          const chartData = response.data.forecast.map(item => ({
            // Handle timestamps safely
            time: new Date(item.timestamp).getHours() + ":00",
            volume: item.predicted_volume
          }));
          setData(chartData);
        } else {
          console.error("Forecast array is missing from the API response.");
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching forecast:", error);
        setLoading(false);
      }
    };
    
    fetchForecast();
  }, [city]);

  if (loading) return <div className="text-slate-500 animate-pulse">Loading Brain Data...</div>;

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
          <YAxis stroke="#94a3b8" fontSize={12} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
            itemStyle={{ color: '#10b981' }}
          />
          <Line 
            type="monotone" 
            dataKey="volume" 
            stroke="#10b981" 
            strokeWidth={3} 
            dot={{ r: 4 }} 
            activeDot={{ r: 8 }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DemandChart;
