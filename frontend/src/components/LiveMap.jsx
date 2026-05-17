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
    const fetchFleet = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/fleet/live-telemetry`);
        setFleet(res.data);
        setError(false);
      } catch (err) {
        console.error("Radar offline:", err.message);
        setError(true);
      }
    };

    fetchFleet();
    const interval = setInterval(fetchFleet, 5000); // Sweep radar every 5 seconds
    return () => clearInterval(interval);
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
