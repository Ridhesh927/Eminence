import { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { io } from 'socket.io-client';
import { Navigation, Crosshair } from 'lucide-react';

import api from '../../services/api';
import { getToken } from '../../services/tokenService';

// Fix for default marker icon in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
});

// Custom pin icons for Pickup (A / Green) and Drop (B / Copper)
const createPinIcon = (label, color = 'copper') => {
  const isPickup = color === 'moss';
  const bgColor = isPickup ? '#10b981' : '#e86331';
  const shadowColor = isPickup ? 'rgba(16, 185, 129, 0.45)' : 'rgba(232, 99, 49, 0.45)';

  return L.divIcon({
    className: 'custom-route-pin',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
        <div style="
          width: 32px; 
          height: 32px; 
          border-radius: 50%; 
          background: ${bgColor}; 
          color: #ffffff; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-weight: 800; 
          font-size: 13px; 
          font-family: ui-sans-serif, system-ui, sans-serif;
          box-shadow: 0 4px 14px ${shadowColor}; 
          border: 2.5px solid #ffffff;
        ">
          ${label}
        </div>
        <div style="width: 2px; height: 6px; background: ${bgColor};"></div>
        <div style="width: 6px; height: 6px; border-radius: 50%; background: ${bgColor}; opacity: 0.85;"></div>
      </div>
    `,
    iconSize: [32, 44],
    iconAnchor: [16, 44],
    popupAnchor: [0, -44]
  });
};

// Custom truck icon for live driver vehicle
const truckIcon = new L.Icon({
  iconUrl: '/images/map_marker_truck_1787941237726.jpg',
  iconSize: [46, 46],
  iconAnchor: [23, 23],
  popupAnchor: [0, -23],
  className: 'rounded-full border-2 border-copper-500 shadow-2xl object-cover'
});

// FitBounds component to auto-frame all points smoothly on initial load
const FitBounds = ({ positions }) => {
  const map = useMap();
  const hasFittedRef = useRef(false);

  useEffect(() => {
    if (!positions || positions.length === 0 || hasFittedRef.current) return;
    try {
      const valid = positions.filter(
        p => p && Array.isArray(p) && p.length === 2 && !isNaN(p[0]) && !isNaN(p[1])
      );
      if (valid.length === 1) {
        map.setView(valid[0], 14, { animate: true });
        hasFittedRef.current = true;
      } else if (valid.length > 1) {
        const bounds = L.latLngBounds(valid);
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15, animate: true });
        hasFittedRef.current = true;
      }
    } catch (e) {
      console.warn('Map fit bounds notice:', e);
    }
  }, [positions, map]);

  return null;
};

// Map View Controller hook to programmatically zoom/pan
const MapViewButtons = ({ driverPosition, allPositions }) => {
  const map = useMap();

  const handleFocusDriver = () => {
    if (driverPosition && driverPosition[0] && driverPosition[1]) {
      map.setView(driverPosition, 16, { animate: true });
    }
  };

  const handleFitRoute = () => {
    if (allPositions && allPositions.length > 0) {
      const valid = allPositions.filter(p => p && Array.isArray(p) && p.length === 2);
      if (valid.length > 1) {
        map.fitBounds(L.latLngBounds(valid), { padding: [50, 50], maxZoom: 15, animate: true });
      } else if (valid.length === 1) {
        map.setView(valid[0], 14, { animate: true });
      }
    }
  };

  return (
    <div className="absolute top-4 right-4 z-[999] flex flex-col gap-2 pointer-events-auto">
      <button
        onClick={handleFitRoute}
        title="Fit Entire Route"
        className="bg-loft-900/90 hover:bg-loft-800 text-loft-200 hover:text-white p-2.5 rounded-xl border border-loft-700 shadow-xl backdrop-blur-md flex items-center gap-1.5 text-xs font-semibold transition-all hover:scale-105 active:scale-95"
      >
        <Crosshair className="w-4 h-4 text-copper-400" />
        <span className="hidden sm:inline">Fit Route</span>
      </button>
      <button
        onClick={handleFocusDriver}
        title="Focus Vehicle Location"
        className="bg-loft-900/90 hover:bg-loft-800 text-loft-200 hover:text-white p-2.5 rounded-xl border border-loft-700 shadow-xl backdrop-blur-md flex items-center gap-1.5 text-xs font-semibold transition-all hover:scale-105 active:scale-95"
      >
        <Navigation className="w-4 h-4 text-moss-400" />
        <span className="hidden sm:inline">Focus Vehicle</span>
      </button>
    </div>
  );
};

const TrackingMap = ({ 
  bookingId, 
  initialLat = null,
  initialLng = null,
  isReconnecting = false, 
  currentPosition = null,
  routeCoordinates = [],
  pickupPosition = null,
  dropPosition = null,
  stopsPositions = [],
  pickupAddress = '',
  dropAddress = '',
  driverName = '',
  vehicleNumber = '',
  speed = 0,
  status = 'in_transit'
}) => {
  const [driverPosition, setDriverPosition] = useState(
    initialLat != null && initialLng != null ? [initialLat, initialLng] : null
  );
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (currentPosition && Array.isArray(currentPosition) && currentPosition.length === 2 && !isNaN(currentPosition[0]) && !isNaN(currentPosition[1])) {
      setDriverPosition(currentPosition);
    }
  }, [currentPosition]);

  useEffect(() => {
    // Initialize socket connection for real-time telemetry updates
    const token = getToken();
    const socketBaseUrl = api.defaults.baseURL?.replace(/\/api\/?$/, '') || window.location.origin;
    const socket = io(socketBaseUrl, {
      withCredentials: true,
      auth: { token }
    });

    socket.on('connect', () => {
      setIsConnected(true);
      if (bookingId) {
        socket.emit('join_trip', bookingId);
      }
    });

    socket.on('connect_error', () => {
      setIsConnected(false);
    });

    socket.on('trip:location_update', (data) => {
      if (data && data.lat && data.lng) {
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

  // Aggregate all key map positions for fitting
  const allPositions = useMemo(() => {
    const list = [];
    if (pickupPosition) list.push(pickupPosition);
    if (dropPosition) list.push(dropPosition);
    if (stopsPositions && stopsPositions.length > 0) list.push(...stopsPositions);
    if (driverPosition && driverPosition[0]) list.push(driverPosition);
    return list;
  }, [pickupPosition, dropPosition, stopsPositions, driverPosition, initialLat, initialLng]);

  const showOverlay = !isConnected || isReconnecting;
  const mapCenter = driverPosition || pickupPosition || dropPosition;

  if (!mapCenter) {
    return (
      <div className="relative w-full h-full min-h-[350px] overflow-hidden bg-loft-950 flex items-center justify-center">
        <p className="text-sm text-loft-400">Waiting for route and GPS coordinates...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[350px] overflow-hidden bg-loft-950">
      {/* Reconnecting / Offline Overlay */}
      {showOverlay && (
        <div data-testid="map-reconnecting-overlay" className="absolute inset-0 z-[1000] bg-loft-950/80 flex items-center justify-center backdrop-blur-sm">
          <div className="flex flex-col items-center">
            <div className="w-9 h-9 border-4 border-copper-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-loft-50 font-semibold text-sm">Connecting to Live GPS Telematics...</p>
            <p className="text-xs text-loft-400 mt-1">Live telemetry sync paused while offline</p>
          </div>
        </div>
      )}

      {/* Floating Map Status Overlay Header */}
      <div className="absolute top-4 left-4 z-[999] pointer-events-none flex flex-col gap-1.5">
        <div className="bg-loft-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-copper-500/30 shadow-lg flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-semibold text-loft-100">
            {status === 'completed' 
              ? 'Trip Completed' 
              : status === 'in_transit' 
                ? 'Tempo in Transit' 
                : 'Driver Assigned'}
          </span>
          {speed > 0 && (
            <span className="text-xs font-mono font-bold text-copper-400 ml-1 border-l border-loft-700 pl-2">
              {speed} km/h
            </span>
          )}
        </div>
      </div>

      <MapContainer 
        center={mapCenter}
        zoom={13} 
        scrollWheelZoom={true}
        zoomControl={false}
        className="w-full h-full z-0"
      >
        <ZoomControl position="bottomright" />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles"
        />

        <FitBounds positions={allPositions} />
        <MapViewButtons driverPosition={driverPosition} allPositions={allPositions} />

        {/* Turn-by-Turn Road Route Polyline */}
        {routeCoordinates && Array.isArray(routeCoordinates) && routeCoordinates.length > 0 && (
          <>
            {/* Glowing outer polyline */}
            <Polyline
              positions={routeCoordinates}
              pathOptions={{
                color: '#b87333',
                weight: 7,
                opacity: 0.45,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />
            {/* Sharp inner polyline */}
            <Polyline
              positions={routeCoordinates}
              pathOptions={{
                color: '#ea580c',
                weight: 4,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />
          </>
        )}

        {/* Pickup Marker (Point A - Green) */}
        {pickupPosition && (
          <Marker position={pickupPosition} icon={createPinIcon('A', 'moss')}>
            <Popup>
              <div className="text-xs p-1">
                <div className="font-bold text-emerald-600 flex items-center gap-1">
                  <span>Point A (Pickup)</span>
                </div>
                <div className="text-gray-700 mt-1 font-medium">{pickupAddress || 'Pickup Location'}</div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Intermediate Stop Markers if present */}
        {stopsPositions && stopsPositions.map((stopPos, idx) => (
          <Marker key={`stop-${idx}`} position={stopPos} icon={createPinIcon(String(idx + 1), 'copper')}>
            <Popup>
              <div className="text-xs p-1">
                <div className="font-bold text-copper-600">Stop {idx + 1}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Drop Marker (Point B - Copper) */}
        {dropPosition && (
          <Marker position={dropPosition} icon={createPinIcon('B', 'copper')}>
            <Popup>
              <div className="text-xs p-1">
                <div className="font-bold text-orange-600 flex items-center gap-1">
                  <span>Point B (Drop Destination)</span>
                </div>
                <div className="text-gray-700 mt-1 font-medium">{dropAddress || 'Destination Location'}</div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Driver Live Location Vehicle Marker */}
        {driverPosition && <Marker position={driverPosition} icon={truckIcon}>
          <Popup>
            <div className="text-xs p-1 font-sans">
              <div className="font-bold text-gray-900 text-sm">{driverName || 'Eminence Fleet Driver'}</div>
              <div className="text-gray-600 font-mono mt-0.5">{vehicleNumber || 'MH-12-AB-1234'}</div>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold font-mono text-[11px]">
                  {speed > 0 ? `${speed} km/h` : 'Stationary'}
                </span>
                <span className="text-[10px] text-gray-500">Live Telematics</span>
              </div>
            </div>
          </Popup>
        </Marker>}
      </MapContainer>
      
      <style>{`
        .leaflet-container {
          background-color: #0d121c;
          font-family: inherit;
        }
        .map-tiles {
          filter: invert(100%) hue-rotate(180deg) brightness(92%) contrast(92%);
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.4);
        }
      `}</style>
    </div>
  );
};

export default TrackingMap;
