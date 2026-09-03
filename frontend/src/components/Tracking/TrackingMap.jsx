import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { io } from 'socket.io-client';

// Fix for default marker icon in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom truck icon for driver
const truckIcon = new L.Icon({
  iconUrl: '/images/map_marker_truck_1787941237726.jpg', // 3D truck marker
  iconSize: [45, 45],
  iconAnchor: [22, 45],
  popupAnchor: [0, -45],
  className: 'rounded-full border-2 border-copper-500 shadow-lg object-cover'
});

const TrackingMap = ({ bookingId, initialLat = 18.5204, initialLng = 73.8567 }) => {
  const [driverPosition, setDriverPosition] = useState([initialLat, initialLng]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const socket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000', {
      withCredentials: true,
    });

    socket.on('connect', () => {
      setIsConnected(true);
      if (bookingId) {
        socket.emit('join_trip', bookingId);
      }
    });

    socket.on('trip:location_update', (data) => {
      if (data.lat && data.lng) {
        setDriverPosition([data.lat, data.lng]);
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [bookingId]);

  return (
    <div className="relative w-full h-[500px] rounded-xl overflow-hidden border border-loft-700/50 shadow-lg">
      {!isConnected && (
        <div className="absolute inset-0 z-[1000] bg-loft-950/80 flex items-center justify-center backdrop-blur-sm">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-copper-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-loft-50 font-medium">Connecting to GPS tracking...</p>
          </div>
        </div>
      )}
      
      <MapContainer 
        center={driverPosition} 
        zoom={14} 
        scrollWheelZoom={false}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles"
        />
        <Marker position={driverPosition} icon={truckIcon}>
          <Popup>
            <div className="text-loft-950 font-semibold">Driver's Current Location</div>
            <div className="text-sm">Updated just now</div>
          </Popup>
        </Marker>
      </MapContainer>
      
      <style>{`
        .leaflet-container {
          background-color: #1a1a1a;
        }
        .map-tiles {
          filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
        }
      `}</style>
    </div>
  );
};

export default TrackingMap;
