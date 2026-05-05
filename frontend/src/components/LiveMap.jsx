import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// 3D Isometric Delivery Truck
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
        src="https://cdn-icons-png.magnific.com/256/683/683078.png?semt=ais_white_label" 
        style="width: 30px; height: 30px; object-fit: contain;" 
        alt="3D Delivery Truck" 
      />
    </div>
  `,
  iconSize: [50, 50],
  iconAnchor: [25, 25], // Centered on the GPS coordinate
  popupAnchor: [0, -20],
});

// Helper component to smoothly pan the map as the truck moves
const RecenterAutomatically = ({ lat, lon }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon]);
  }, [lat, lon, map]);
  return null;
}

const LiveMap = () => {
  const [truckData, setTruckData] = useState(null);

  useEffect(() => {
    // Polling function
    const fetchLocation = async () => {
      try {
        const res = await axios.get('http://127.0.0.1:8000/fleet/live');
        setTruckData(res.data);
      } catch (error) {
        console.error("Failed to fetch live location", error);
      }
    };

    fetchLocation(); // Initial fetch
    const interval = setInterval(fetchLocation, 2000); // Ping every 2 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  if (!truckData) return <div className="p-4 text-slate-500 animate-pulse">Acquiring GPS Signal...</div>;

  return (
    <div className="w-full h-[500px] rounded-lg overflow-hidden border border-slate-700 z-0 relative">
      <MapContainer 
        center={truckData.location} 
        zoom={13} 
        style={{ height: '100%', width: '100%', backgroundColor: '#0f172a' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <RecenterAutomatically lat={truckData.location[0]} lon={truckData.location[1]} />
        <Marker position={truckData.location} icon={truckIcon}>
          <Popup className="custom-popup">
            <div className="text-slate-800 font-semibold p-1">
              <div className="text-blue-600 text-lg">{truckData.id}</div>
              <div className="text-sm">{truckData.status}</div>
              <div className="text-xs text-slate-500 mt-1">Speed: {truckData.speed}</div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default LiveMap;