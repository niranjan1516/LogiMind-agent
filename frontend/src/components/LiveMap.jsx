import { Fragment, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { API_BASE_URL } from '../lib/api';

// Fix for default Leaflet icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom 3D Truck Icon
const truckIcon = L.divIcon({
  className: 'clear-leaflet-styles',
  html: `
    <div style="
      filter: drop-shadow(0px 10px 8px rgba(0,0,0,0.6)); 
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    ">
      <img 
        src="https://cdn-icons-png.flaticon.com/512/683/683078.png" 
        style="width: 35px; height: 35px; object-fit: contain;" 
        alt="Delivery Truck" 
      />
    </div>
  `,
  iconSize: [50, 50],
  iconAnchor: [25, 25],
  popupAnchor: [0, -20],
});

// Component to handle smooth map centering
const RecenterAutomatically = ({ lat, lon }) => {
  const map = useMap();
  useEffect(() => {
    if (lat && lon) {
      map.panTo([lat, lon], { animate: true, duration: 1.5 });
    }
  }, [lat, lon, map]);
  return null;
}

// ... keep your imports and Leaflet setup ...

const LiveMap = () => {
  const [fleet, setFleet] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => {
  // 1. Initial seed fetch to get current fleet status on load
  const fetchFleetOnLoad = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/fleet/live-telemetry`);
      setFleet(res.data);
      setError(false);
    } catch (err) {
      console.error("Initial radar fetch failed:", err.message);
      setError(true);
    }
  };
  fetchFleetOnLoad();

  // 1. Strip any trailing slash from your API base URL
const cleanBaseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;

// 2. Safely strip the http:// or https:// prefix to get just the domain host
const host = cleanBaseUrl.replace(/^https?:\/\//, "");

// 3. Force 'wss://' if the base URL uses https, otherwise fall back to 'ws://' for local dev
const protocol = cleanBaseUrl.startsWith("https") ? "wss://" : "ws://";

// 4. Combine them cleanly
const wsUrl = `${protocol}${host}/ws/DASHBOARD_MAP`;

console.log("📡 Attempting WebSocket connection to:", wsUrl);
const socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log("🚀 Connected to live telemetry stream via WebSocket");
    setError(false);
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("📡 Live location packet received:", data);

      // Map expects latitude/longitude, but backend WS sends lat/lng
      if (!data.driver_id || !data.lat || !data.lng) return;

      setFleet((prevFleet) => {
        const existingTruckIndex = prevFleet.findIndex(
          (truck) => truck.driver_id === data.driver_id
        );

        const updatedTruck = {
          driver_id: data.driver_id,
          latitude: data.lat,
          longitude: data.lng,
          speed: data.speed || 0, 
          last_ping: new Date().toLocaleTimeString(),
        };

        if (existingTruckIndex > -1) {
          // Update existing truck matching this driver ID
          const currentFleet = [...prevFleet];
          currentFleet[existingTruckIndex] = {
            ...currentFleet[existingTruckIndex],
            ...updatedTruck,
          };
          return currentFleet;
        } else {
          // If a new driver comes online, add them to the map
          return [...prevFleet, updatedTruck];
        }
      });
    } catch (err) {
      console.error("Error parsing telemetry frame:", err);
    }
  };

  socket.onerror = (err) => {
    console.error("❌ WebSocket Stream Error:", err);
    setError(true);
  };

  socket.onclose = () => {
    console.log("🔌 Telemetry stream closed.");
  };

  // Clean up socket if component unmounts or re-renders
  return () => {
    socket.close();
  };
}, []);

  if (error) return <div className="p-4 text-red-500 bg-slate-900 rounded">Radar Offline: Cannot reach dispatch server.</div>;
  
  // Default center to Mumbai if no trucks are active
  const defaultCenter = fleet.length > 0 ? [fleet[0].latitude, fleet[0].longitude] : [19.0760, 72.8777];

  return (
    <div className="w-full h-[500px] rounded-lg overflow-hidden border border-slate-700 shadow-2xl relative">
      <MapContainer center={defaultCenter} zoom={13} style={{ height: '100%', width: '100%', backgroundColor: '#0f172a' }}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        
        {fleet.map((truck) => (
          <Fragment key={truck.driver_id}>
            {/* Optionally recenter on the first truck */}
            {fleet.length === 1 && <RecenterAutomatically lat={truck.latitude} lon={truck.longitude} />}
            
            <Marker position={[truck.latitude, truck.longitude]} icon={truckIcon}>
              <Popup className="custom-popup">
                <div className="text-slate-800 font-semibold p-1">
                  <div className="text-blue-600 text-lg">{truck.driver_id}</div>
                  <div className="text-xs text-slate-500 mt-1">Speed: {truck.speed} km/h</div>
                  <div className="text-xs text-slate-400 mt-1">Last Ping: {truck.last_ping}</div>
                </div>
              </Popup>
            </Marker>
          </Fragment>
        ))}
      </MapContainer>
    </div>
  );
};

export default LiveMap;
