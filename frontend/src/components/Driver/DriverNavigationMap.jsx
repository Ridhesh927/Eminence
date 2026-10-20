import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  Navigation, 
  Compass, 
  Maximize2, 
  ExternalLink, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  Gauge, 
  MapPin,
  PackageCheck,
  ShieldCheck,
  ArrowRight,
  Check
} from 'lucide-react';
import { geocodeAddress, fetchOsrmRoute } from '../../utils/puneGeocoder';

// Fix for default Leaflet marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
});

// Calculate bearing angle (0 - 360 degrees) between two coordinates
function calculateBearing(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  const brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}

// Calculate Haversine distance in meters
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Generate dense waypoints along route polyline for silky smooth 60fps movement
function generateDenseRoute(polyline, maxStepMeters = 18) {
  if (!polyline || polyline.length < 2) return polyline || [];
  const dense = [];

  for (let i = 0; i < polyline.length - 1; i++) {
    const p1 = polyline[i];
    const p2 = polyline[i + 1];
    dense.push(p1);

    const distMeters = getDistanceMeters(p1[0], p1[1], p2[0], p2[1]);
    if (distMeters > maxStepMeters) {
      const steps = Math.floor(distMeters / maxStepMeters);
      for (let s = 1; s < steps; s++) {
        const ratio = s / steps;
        dense.push([
          p1[0] + (p2[0] - p1[0]) * ratio,
          p1[1] + (p2[1] - p1[1]) * ratio
        ]);
      }
    }
  }
  dense.push(polyline[polyline.length - 1]);
  return dense;
}

// Rotating Tempo Marker with Directional Beacon and Pulse Wave
const createRotatingTruckIcon = (bearing = 0, isMoving = false, speedKmh = 0) => {
  return L.divIcon({
    className: 'custom-rotating-truck-marker',
    html: `
      <div style="position: relative; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        <!-- Pulsing radar wave when moving -->
        ${isMoving ? `
          <div style="
            position: absolute;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: rgba(232, 99, 49, 0.45);
            animation: tempoRadar 1.4s ease-out infinite;
          "></div>
        ` : ''}

        <!-- Rotating tempo container -->
        <div style="
          position: relative;
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background: #141720;
          border: 2.8px solid #e86331;
          box-shadow: 0 4px 18px rgba(232, 99, 49, 0.75), 0 0 10px rgba(0,0,0,0.9);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(${bearing}deg);
          transition: transform 0.22s ease-out;
        ">
          <img 
            src="/images/map_marker_truck_1787941237726.jpg" 
            alt="Tempo Truck"
            style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;"
          />
        </div>

        <!-- Directional forward pointer arrow -->
        <div style="
          position: absolute;
          top: -2px;
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-bottom: 9px solid #e86331;
          transform-origin: 50% 30px;
          transform: rotate(${bearing}deg);
          filter: drop-shadow(0 0 4px #e86331);
        "></div>

        <!-- Live speed tag -->
        ${isMoving && speedKmh > 0 ? `
          <div style="
            position: absolute;
            bottom: -8px;
            background: #0f172a;
            color: #38bdf8;
            font-size: 9px;
            font-weight: 800;
            padding: 1px 5px;
            border-radius: 6px;
            border: 1px solid rgba(56, 189, 248, 0.4);
            box-shadow: 0 2px 6px rgba(0,0,0,0.8);
            white-space: nowrap;
            letter-spacing: 0.2px;
          ">
            ${Math.round(speedKmh)} km/h
          </div>
        ` : ''}
      </div>
    `,
    iconSize: [56, 56],
    iconAnchor: [28, 28],
    popupAnchor: [0, -28]
  });
};

// Pickup Origin Pin Icon (Phase 1)
const createPickupIcon = (isVerified = false) => {
  const pinBg = isVerified ? '#10b981' : '#0284c7';
  const shadowBg = isVerified ? 'rgba(16, 185, 129, 0.65)' : 'rgba(2, 132, 199, 0.65)';
  return L.divIcon({
    className: 'custom-pickup-pin',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
        <div style="
          width: 36px; 
          height: 36px; 
          border-radius: 50%; 
          background: ${pinBg}; 
          color: #ffffff; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-weight: 800; 
          font-size: 16px; 
          box-shadow: 0 4px 16px ${shadowBg}; 
          border: 2.5px solid #ffffff;
        ">
          ${isVerified ? '✓' : '📦'}
        </div>
        <div style="width: 2px; height: 7px; background: ${pinBg};"></div>
        <div style="width: 6px; height: 6px; border-radius: 50%; background: ${pinBg}; opacity: 0.85;"></div>
      </div>
    `,
    iconSize: [36, 49],
    iconAnchor: [18, 49],
    popupAnchor: [0, -49]
  });
};

// Destination Drop-off Pin Icon (Phase 2)
const createDestinationIcon = (isCompleted = false) => {
  const pinBg = isCompleted ? '#10b981' : '#e86331';
  const shadowBg = isCompleted ? 'rgba(16, 185, 129, 0.65)' : 'rgba(232, 99, 49, 0.65)';
  return L.divIcon({
    className: 'custom-dest-pin',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
        <div style="
          width: 36px; 
          height: 36px; 
          border-radius: 50%; 
          background: ${pinBg}; 
          color: #ffffff; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-weight: 800; 
          font-size: 16px; 
          box-shadow: 0 4px 16px ${shadowBg}; 
          border: 2.5px solid #ffffff;
        ">
          ${isCompleted ? '✓' : '🏁'}
        </div>
        <div style="width: 2px; height: 7px; background: ${pinBg};"></div>
        <div style="width: 6px; height: 6px; border-radius: 50%; background: ${pinBg}; opacity: 0.85;"></div>
      </div>
    `,
    iconSize: [36, 49],
    iconAnchor: [18, 49],
    popupAnchor: [0, -49]
  });
};

// Dynamic Map Camera Controller
const MapCameraController = ({ centerPos, bounds, autoFollow, fitTrigger, onAutoFollowChange }) => {
  const map = useMap();
  const prevAutoFollowRef = useRef(false);
  const isFittingRef = useRef(false);
  const boundsRef = useRef(bounds);

  useEffect(() => {
    boundsRef.current = bounds;
  }, [bounds]);

  // When user drags map, naturally toggle off autoFollow to allow free inspection
  useEffect(() => {
    const handleDrag = () => {
      if (onAutoFollowChange) {
        onAutoFollowChange(false);
      }
    };
    map.on('dragstart', handleDrag);
    return () => {
      map.off('dragstart', handleDrag);
    };
  }, [map, onAutoFollowChange]);

  // Explicit bounds fit (triggered ONLY on fitTrigger or manual Fit Route action)
  useEffect(() => {
    if (fitTrigger === 0) return;
    const targetBounds = boundsRef.current || bounds;
    if (!targetBounds || targetBounds.length === 0) return;
    try {
      isFittingRef.current = true;
      const leafletBounds = L.latLngBounds(targetBounds);
      map.fitBounds(leafletBounds, {
        paddingTopLeft: [40, 120],
        paddingBottomRight: [40, 60],
        maxZoom: 15,
        animate: true
      });
      const timer = setTimeout(() => {
        isFittingRef.current = false;
      }, 600);
      return () => clearTimeout(timer);
    } catch (e) {
      console.warn('Map fit bounds notice:', e);
      isFittingRef.current = false;
    }
  }, [fitTrigger, map]);

  // Auto-follow moving tempo (smooth pan, never fights or overrides zoom level)
  useEffect(() => {
    if (!autoFollow || !centerPos || isFittingRef.current) return;
    try {
      const wasLocked = prevAutoFollowRef.current;
      prevAutoFollowRef.current = autoFollow;

      // When newly activating Camera Lock, zoom into driver navigation view (min zoom 15)
      if (!wasLocked) {
        map.setView([centerPos.lat, centerPos.lng], Math.max(map.getZoom(), 15), {
          animate: true,
          duration: 0.35
        });
        return;
      }

      // During active simulation, gently pan center coordinates without altering current zoom!
      map.panTo([centerPos.lat, centerPos.lng], {
        animate: true,
        duration: 0.15,
        noMoveStart: true
      });
    } catch (e) {
      console.warn('Auto follow notice:', e);
    }
  }, [centerPos?.lat, centerPos?.lng, autoFollow, map]);

  return null;
};

const DEFAULT_PUNE_COORDS = { lat: 18.5204, lng: 73.8567 };

const DriverNavigationMap = ({
  driverPos: rawDriverPos,
  activeRide,
  currentLeg: controlledLeg,
  onLegChange,
  onArrivedPickup,
  onVerifyPickup,
  onArrivedDropoff,
  onLocationUpdate,
  onFinishTrip,
  isFinishingTrip = false,
  className = ''
}) => {
  // Ensure a valid driver position is guaranteed with Pune fallback
  const driverPos = useMemo(() => {
    if (rawDriverPos && typeof rawDriverPos.lat === 'number' && typeof rawDriverPos.lng === 'number' && !isNaN(rawDriverPos.lat) && !isNaN(rawDriverPos.lng)) {
      return rawDriverPos;
    }
    return DEFAULT_PUNE_COORDS;
  }, [rawDriverPos]);

  // Geocoded Coordinates
  const [pickupCoord, setPickupCoord] = useState(null);
  const [dropCoord, setDropCoord] = useState(null);

  // Multi-Leg Route Geometry & Telematics
  const [leg1Route, setLeg1Route] = useState(null); // Driver -> Pickup
  const [leg2Route, setLeg2Route] = useState(null); // Pickup -> Dropoff
  const [isLoadingRoute, setIsLoadingRoute] = useState(true);

  // Active Navigation Leg: 'to_pickup' (Phase 1) | 'to_dropoff' (Phase 2)
  const initialLeg = (activeRide?.status === 'in_transit' || activeRide?.status === 'completed') 
    ? 'to_dropoff' 
    : 'to_pickup';
  const [activeLeg, setActiveLeg] = useState(controlledLeg || initialLeg);

  // Synchronize controlled leg when prop changes
  useEffect(() => {
    if (controlledLeg && controlledLeg !== activeLeg) {
      setActiveLeg(controlledLeg);
    }
  }, [controlledLeg]);

  // Synchronize leg based on ride status
  useEffect(() => {
    if (activeRide?.status === 'in_transit' && activeLeg === 'to_pickup') {
      setActiveLeg('to_dropoff');
    }
  }, [activeRide?.status]);

  // Verification & Arrival States
  const [hasArrivedPickup, setHasArrivedPickup] = useState(false);
  const [hasArrivedDropoff, setHasArrivedDropoff] = useState(false);
  const [isPickupVerified, setIsPickupVerified] = useState(
    activeRide?.status === 'in_transit' || activeRide?.status === 'completed'
  );

  // In-Map OTP Verification Form State
  const [mapOtpInput, setMapOtpInput] = useState('');
  const [mapOtpError, setMapOtpError] = useState('');
  const [isVerifyingMapOtp, setIsVerifyingMapOtp] = useState(false);

  // Simulation State
  const [isSimulating, setIsSimulating] = useState(true);
  const [simSpeedMultiplier, setSimSpeedMultiplier] = useState(3); // 1x, 3x, 8x
  const [simIndex, setSimIndex] = useState(0);
  const [simPos, setSimPos] = useState(driverPos);
  const [simBearing, setSimBearing] = useState(0);
  const [simSpeedKmh, setSimSpeedKmh] = useState(42);
  const [autoFollow, setAutoFollow] = useState(true);
  const [fitTrigger, setFitTrigger] = useState(0);

  const currentPos = (simPos && typeof simPos.lat === 'number' && typeof simPos.lng === 'number' && !isNaN(simPos.lat))
    ? simPos
    : driverPos;

  useEffect(() => {
    if (driverPos?.lat && driverPos?.lng) {
      setSimPos(prev => (prev && typeof prev.lat === 'number' ? prev : driverPos));
    }
  }, [driverPos]);

  const pickupAddress = activeRide?.pickup || activeRide?.pickupAddress || 'Pickup Origin';
  const dropoffAddress = activeRide?.dropoff || activeRide?.dropAddress || 'Destination';
  const lastBroadcastRef = useRef(0);

  // 1. Geocode both Pickup and Dropoff addresses
  useEffect(() => {
    let isCancelled = false;

    const resolveCoords = async () => {
      setIsLoadingRoute(true);
      try {
        const [pCoord, dCoord] = await Promise.all([
          pickupAddress ? geocodeAddress(pickupAddress) : null,
          dropoffAddress ? geocodeAddress(dropoffAddress) : null
        ]);

        if (!isCancelled) {
          if (pCoord) setPickupCoord(pCoord);
          if (dCoord) setDropCoord(dCoord);
        }
      } catch (err) {
        console.warn('Geocoding notice:', err);
      } finally {
        if (!isCancelled) setIsLoadingRoute(false);
      }
    };

    resolveCoords();
    return () => { isCancelled = true; };
  }, [pickupAddress, dropoffAddress]);

  const rideId = activeRide?.bookingId || activeRide?.id || 'active_trip';
  const prevRideIdRef = useRef(null);
  const routeOriginRef = useRef(null);

  // If active ride changes, reset origin and route cache
  if (prevRideIdRef.current !== rideId) {
    prevRideIdRef.current = rideId;
    routeOriginRef.current = null;
  }

  // Anchor the starting point for route calculation once
  if (!routeOriginRef.current && driverPos?.lat && driverPos?.lng) {
    routeOriginRef.current = { lat: driverPos.lat, lng: driverPos.lng };
  }

  // 2. Fetch OSRM turn-by-turn routes for both Leg 1 and Leg 2 (once per ride)
  useEffect(() => {
    let isCancelled = false;
    const origin = routeOriginRef.current || driverPos;
    if (!origin || !pickupCoord) return;

    const calculateRoutes = async () => {
      setIsLoadingRoute(true);
      try {
        // Leg 1: Driver -> Pickup Origin
        const route1 = await fetchOsrmRoute([origin, pickupCoord]);
        if (isCancelled) return;
        const dense1 = generateDenseRoute(route1.polyline, 16);
        setLeg1Route({
          ...route1,
          denseRoute: dense1
        });

        // Initialize starting sim position from the route start if not set
        if (dense1.length > 0) {
          const startPt = { lat: dense1[0][0], lng: dense1[0][1] };
          setSimPos(prev => (prev && typeof prev.lat === 'number' ? prev : startPt));
          if (dense1.length > 1) {
            setSimBearing(calculateBearing(dense1[0][0], dense1[0][1], dense1[1][0], dense1[1][1]));
          }
        }

        // Leg 2: Pickup Origin -> Drop-off Destination
        if (dropCoord) {
          const route2 = await fetchOsrmRoute([pickupCoord, dropCoord]);
          if (isCancelled) return;
          const dense2 = generateDenseRoute(route2.polyline, 16);
          setLeg2Route({
            ...route2,
            denseRoute: dense2
          });
        }
      } catch (err) {
        console.warn('Route calculation notice:', err);
      } finally {
        if (!isCancelled) setIsLoadingRoute(false);
      }
    };

    calculateRoutes();
    return () => { isCancelled = true; };
  }, [rideId, pickupCoord?.lat, pickupCoord?.lng, dropCoord?.lat, dropCoord?.lng]);

  // Current Active Route Dense Waypoints
  const activeDenseRoute = useMemo(() => {
    if (activeLeg === 'to_pickup') {
      return leg1Route?.denseRoute || [];
    }
    return leg2Route?.denseRoute || [];
  }, [activeLeg, leg1Route, leg2Route]);

  const activeTotalDistanceKm = useMemo(() => {
    if (activeLeg === 'to_pickup') {
      return leg1Route?.distanceKm || 0;
    }
    return leg2Route?.distanceKm || 0;
  }, [activeLeg, leg1Route, leg2Route]);

  const activeInitialDurationMins = useMemo(() => {
    if (activeLeg === 'to_pickup') {
      return leg1Route?.durationMins || 0;
    }
    return leg2Route?.durationMins || 0;
  }, [activeLeg, leg1Route, leg2Route]);

  // Reset simulation when activeLeg switches (e.g., from pickup to dropoff)
  useEffect(() => {
    setSimIndex(0);
    if (activeLeg === 'to_pickup') {
      setHasArrivedPickup(false);
      if (leg1Route?.denseRoute?.length > 0) {
        const startPt = { lat: leg1Route.denseRoute[0][0], lng: leg1Route.denseRoute[0][1] };
        setSimPos(startPt);
        if (leg1Route.denseRoute.length > 1) {
          setSimBearing(calculateBearing(
            leg1Route.denseRoute[0][0],
            leg1Route.denseRoute[0][1],
            leg1Route.denseRoute[1][0],
            leg1Route.denseRoute[1][1]
          ));
        }
      }
    } else {
      setHasArrivedDropoff(false);
      if (leg2Route?.denseRoute?.length > 0) {
        const startPt = { lat: leg2Route.denseRoute[0][0], lng: leg2Route.denseRoute[0][1] };
        setSimPos(startPt);
        if (leg2Route.denseRoute.length > 1) {
          setSimBearing(calculateBearing(
            leg2Route.denseRoute[0][0],
            leg2Route.denseRoute[0][1],
            leg2Route.denseRoute[1][0],
            leg2Route.denseRoute[1][1]
          ));
        }
      }
    }
  }, [activeLeg]);

  // 3. Tempo Movement Simulation Loop
  const hasArrivedCurrentLeg = activeLeg === 'to_pickup' ? hasArrivedPickup : hasArrivedDropoff;

  useEffect(() => {
    if (!isSimulating || activeDenseRoute.length < 2 || hasArrivedCurrentLeg) return;

    const intervalMs = 60; // 16 ticks per second for smooth glide
    const timer = setInterval(() => {
      setSimIndex((prevIndex) => {
        const nextIndex = prevIndex + simSpeedMultiplier;

        if (nextIndex >= activeDenseRoute.length - 1) {
          // Arrived at current leg destination
          const finalPt = activeDenseRoute[activeDenseRoute.length - 1];
          const finalPos = { lat: finalPt[0], lng: finalPt[1] };
          setSimPos(finalPos);
          setSimSpeedKmh(0);
          setIsSimulating(false);
          onLocationUpdate?.(finalPos);

          if (activeLeg === 'to_pickup') {
            setHasArrivedPickup(true);
            onArrivedPickup?.(finalPos);
          } else {
            setHasArrivedDropoff(true);
            onArrivedDropoff?.(finalPos);
          }
          return activeDenseRoute.length - 1;
        }

        const currentPt = activeDenseRoute[nextIndex];
        const lookAheadPt = activeDenseRoute[Math.min(nextIndex + 2, activeDenseRoute.length - 1)];
        const newPos = { lat: currentPt[0], lng: currentPt[1] };

        // Dynamic bearing to face the road curve
        const newBearing = calculateBearing(
          currentPt[0],
          currentPt[1],
          lookAheadPt[0],
          lookAheadPt[1]
        );

        // Realistic speed fluctuation (36 - 54 km/h)
        const speedVariance = Math.sin(nextIndex / 8) * 8 + (nextIndex % 5 === 0 ? -4 : 3);
        const dynamicSpeed = Math.max(25, Math.min(58, 42 + speedVariance));

        setSimPos(newPos);
        setSimBearing(newBearing);
        setSimSpeedKmh(dynamicSpeed);

        // Broadcast to customer live tracking every 600ms
        const now = Date.now();
        if (now - lastBroadcastRef.current > 600) {
          lastBroadcastRef.current = now;
          onLocationUpdate?.(newPos);
        }

        return nextIndex;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [
    isSimulating, 
    activeDenseRoute, 
    simSpeedMultiplier, 
    hasArrivedCurrentLeg, 
    activeLeg, 
    onLocationUpdate, 
    onArrivedPickup, 
    onArrivedDropoff
  ]);

  // 4. Calculate dynamic remaining metrics for the current leg
  const progressPercent = useMemo(() => {
    if (!activeDenseRoute || activeDenseRoute.length < 2) return 0;
    return Math.min(100, Math.round((simIndex / (activeDenseRoute.length - 1)) * 100));
  }, [simIndex, activeDenseRoute]);

  const remainingDistanceKm = useMemo(() => {
    if (!activeDenseRoute || activeDenseRoute.length < 2) return activeTotalDistanceKm;
    const remainingRatio = 1 - simIndex / (activeDenseRoute.length - 1);
    return Math.max(0, parseFloat((activeTotalDistanceKm * remainingRatio).toFixed(1)));
  }, [simIndex, activeDenseRoute, activeTotalDistanceKm]);

  const remainingDurationMins = useMemo(() => {
    if (hasArrivedCurrentLeg) return 0;
    if (!activeDenseRoute || activeDenseRoute.length < 2) return activeInitialDurationMins;
    const remainingRatio = 1 - simIndex / (activeDenseRoute.length - 1);
    return Math.max(1, Math.round(activeInitialDurationMins * remainingRatio));
  }, [simIndex, activeDenseRoute, activeInitialDurationMins, hasArrivedCurrentLeg]);

  // Split Polylines for Active Leg: Traveled (Emerald Green) vs Remaining (Vibrant Copper)
  const activeTraveledPolyline = useMemo(() => {
    if (!activeDenseRoute || activeDenseRoute.length === 0) return [];
    return activeDenseRoute.slice(0, simIndex + 1);
  }, [activeDenseRoute, simIndex]);

  const activeRemainingPolyline = useMemo(() => {
    if (!activeDenseRoute || activeDenseRoute.length === 0) return [];
    return activeDenseRoute.slice(simIndex);
  }, [activeDenseRoute, simIndex]);

  // Handle Verification 1 (Package Pickup Verification)
  const handleVerifyPickupOtp = async (otpToVerify) => {
    const code = (otpToVerify || mapOtpInput).trim();
    if (!code || code.length !== 4) {
      setMapOtpError('Enter the 4-digit OTP provided by the customer.');
      return;
    }

    setIsVerifyingMapOtp(true);
    setMapOtpError('');

    try {
      if (onVerifyPickup) {
        const res = await onVerifyPickup(code);
        if (res && res.success === false) {
          setMapOtpError(res.message || 'Invalid Start Ride OTP');
          return;
        }
      }

      setIsPickupVerified(true);
      setHasArrivedPickup(false);
      setActiveLeg('to_dropoff');
      onLegChange?.('to_dropoff');
    } catch (err) {
      setMapOtpError(err?.message || 'Verification failed. Please check the code.');
    } finally {
      setIsVerifyingMapOtp(false);
    }
  };

  // Instant Jump Helpers (allows testing without waiting for full simulation)
  const handleJumpToPickup = () => {
    if (!pickupCoord) return;
    setSimPos(pickupCoord);
    setHasArrivedPickup(true);
    setIsSimulating(false);
    setSimSpeedKmh(0);
    onLocationUpdate?.(pickupCoord);
    onArrivedPickup?.(pickupCoord);
  };

  const handleJumpToDropoff = () => {
    if (!dropCoord) return;
    setSimPos(dropCoord);
    setHasArrivedDropoff(true);
    setIsSimulating(false);
    setSimSpeedKmh(0);
    onArrivedDropoff?.(dropCoord);
  };

  // Controls Handlers
  const handleTogglePlay = useCallback(() => {
    if (hasArrivedCurrentLeg) {
      // Replay current leg from start
      setSimIndex(0);
      if (activeLeg === 'to_pickup') setHasArrivedPickup(false);
      else setHasArrivedDropoff(false);
      setIsSimulating(true);
      setSimSpeedKmh(42);
    } else {
      setIsSimulating((prev) => {
        const next = !prev;
        setSimSpeedKmh(next ? 42 : 0);
        return next;
      });
    }
  }, [hasArrivedCurrentLeg, activeLeg]);

  const handleRestart = useCallback(() => {
    setSimIndex(0);
    if (activeLeg === 'to_pickup') setHasArrivedPickup(false);
    else setHasArrivedDropoff(false);
    setIsSimulating(true);
    setSimSpeedKmh(42);
    if (activeDenseRoute.length > 0) {
      setSimPos({ lat: activeDenseRoute[0][0], lng: activeDenseRoute[0][1] });
      setFitTrigger(prev => prev + 1);
    }
  }, [activeLeg, activeDenseRoute]);

  const mapBounds = useMemo(() => {
    const list = [];
    if (pickupCoord?.lat && pickupCoord?.lng) list.push([pickupCoord.lat, pickupCoord.lng]);
    if (dropCoord?.lat && dropCoord?.lng) list.push([dropCoord.lat, dropCoord.lng]);
    const origin = routeOriginRef.current || driverPos;
    if (origin?.lat && origin?.lng) list.push([origin.lat, origin.lng]);
    return list;
  }, [pickupCoord?.lat, pickupCoord?.lng, dropCoord?.lat, dropCoord?.lng, driverPos?.lat, driverPos?.lng]);

  const currentDestination = activeLeg === 'to_pickup' ? pickupAddress : dropoffAddress;
  const currentTargetCoord = activeLeg === 'to_pickup' ? pickupCoord : dropCoord;

  const googleMapsUrl = useMemo(() => {
    const origin = currentPos ? `${currentPos.lat},${currentPos.lng}` : '';
    const dest = currentTargetCoord 
      ? `${currentTargetCoord.lat},${currentTargetCoord.lng}` 
      : encodeURIComponent(currentDestination);
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`;
  }, [currentPos?.lat, currentPos?.lng, currentTargetCoord, currentDestination]);

  return (
    <div className={`flex-1 card overflow-hidden relative min-h-[520px] md:min-h-[580px] border-copper-500/30 flex flex-col ${className}`}>
      
      {/* Top Floating Multi-Leg Route Navigation & Telematics HUD */}
      <div className="absolute top-3 left-3 right-3 bg-gradient-to-r from-loft-950/95 via-loft-900/95 to-loft-950/95 text-white rounded-2xl p-4 shadow-2xl z-[1000] border border-copper-500/30 backdrop-blur-md">
        
        {/* Stage Progress Pills: Phase 1 (Pickup) -> Phase 2 (Drop-off) */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-loft-800/80 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {/* Stage 1 Pill */}
            <button
              type="button"
              onClick={() => {
                setActiveLeg('to_pickup');
                onLegChange?.('to_pickup');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeLeg === 'to_pickup'
                  ? 'bg-sky-500 text-loft-950 shadow-md shadow-sky-500/30'
                  : isPickupVerified
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                    : 'bg-loft-800 text-loft-300 hover:text-loft-100'
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5" />
              <span>1. Pickup: {pickupAddress.split(',')[0]}</span>
              {isPickupVerified && <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />}
            </button>

            <ArrowRight className="w-3.5 h-3.5 text-loft-500" />

            {/* Stage 2 Pill */}
            <button
              type="button"
              onClick={() => {
                if (isPickupVerified || activeRide?.status === 'in_transit') {
                  setActiveLeg('to_dropoff');
                  onLegChange?.('to_dropoff');
                }
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeLeg === 'to_dropoff'
                  ? 'bg-copper-500 text-loft-950 shadow-md shadow-copper-500/30 cursor-pointer'
                  : isPickupVerified
                    ? 'bg-loft-800 text-loft-200 hover:text-white cursor-pointer'
                    : 'bg-loft-900/60 text-loft-500 border border-loft-800 cursor-not-allowed opacity-75'
              }`}
              title={!isPickupVerified ? 'Unlocks after package pickup verification' : 'Switch to Drop-off Route'}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>2. Drop-off: {dropoffAddress.split(',')[0]}</span>
              {!isPickupVerified && <span className="text-[10px]">🔒</span>}
            </button>
          </div>

          {/* Quick-Jump Simulation Testing Buttons */}
          <div className="flex items-center gap-1.5 text-[11px]">
            {activeLeg === 'to_pickup' && !hasArrivedPickup && !isPickupVerified && (
              <button
                type="button"
                onClick={handleJumpToPickup}
                className="px-2.5 py-0.5 rounded bg-sky-950/70 hover:bg-sky-900 text-sky-300 border border-sky-500/40 font-mono font-semibold transition-all cursor-pointer"
                title="Simulate immediate arrival at pickup location"
              >
                ⚡ Arrive at Pickup
              </button>
            )}
            {activeLeg === 'to_dropoff' && !hasArrivedDropoff && (
              <button
                type="button"
                onClick={handleJumpToDropoff}
                className="px-2.5 py-0.5 rounded bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 font-mono font-semibold transition-all cursor-pointer"
                title="Simulate immediate arrival at destination"
              >
                ⚡ Arrive at Drop-off
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          
          {/* Left: Direction and Live Status */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-lg border transition-all ${
              hasArrivedCurrentLeg 
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400' 
                : activeLeg === 'to_pickup'
                  ? 'bg-sky-500/20 border-sky-400 text-sky-400 animate-pulse'
                  : 'bg-copper-500/20 border-copper-400 text-copper-400 animate-pulse'
            }`}>
              {hasArrivedCurrentLeg ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              ) : activeLeg === 'to_pickup' ? (
                <PackageCheck className="w-6 h-6 text-sky-400" />
              ) : (
                <Navigation className="w-6 h-6 text-copper-400 rotate-45" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-base md:text-lg leading-tight truncate text-loft-50">
                  {activeLeg === 'to_pickup'
                    ? (hasArrivedPickup ? 'At Pickup Origin' : 'Leg 1: En Route to Pickup')
                    : (hasArrivedDropoff ? 'At Destination' : 'Leg 2: In Transit to Drop-off')}
                </h4>
                
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                  hasArrivedCurrentLeg
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-400/40'
                    : isSimulating
                      ? activeLeg === 'to_pickup'
                        ? 'bg-sky-950/60 text-sky-300 border-sky-400/40'
                        : 'bg-copper-950/60 text-copper-300 border-copper-400/40'
                      : 'bg-loft-800 text-loft-300 border-loft-700'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    hasArrivedCurrentLeg 
                      ? 'bg-emerald-400' 
                      : isSimulating 
                        ? (activeLeg === 'to_pickup' ? 'bg-sky-400 animate-ping' : 'bg-copper-400 animate-ping')
                        : 'bg-loft-500'
                  }`}></span>
                  {hasArrivedCurrentLeg ? 'Arrived 📍' : isSimulating ? 'Moving' : 'Drive Paused'}
                </span>

                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-cyan-300 bg-cyan-950/50 border border-cyan-500/30 px-2 py-0.5 rounded-md">
                  <Gauge className="w-3 h-3 text-cyan-400" />
                  {hasArrivedCurrentLeg ? '0 km/h' : `${Math.round(simSpeedKmh)} km/h`}
                </span>
              </div>

              <p className="text-loft-300 text-xs truncate max-w-lg mt-0.5 flex items-center gap-1.5">
                <MapPin className={`w-3.5 h-3.5 shrink-0 ${activeLeg === 'to_pickup' ? 'text-sky-400' : 'text-copper-400'}`} />
                <span>
                  {activeLeg === 'to_pickup' ? 'Pickup at: ' : 'Drop-off at: '}
                  <strong className="text-loft-100 font-semibold">{currentDestination}</strong>
                </span>
              </p>
            </div>
          </div>

          {/* Right: Live Remaining Distance & Countdown ETA */}
          <div className="flex items-center gap-4 shrink-0 sm:text-right w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-loft-800">
            <div>
              <p className="text-xs text-loft-400 font-medium">Leg Distance Left</p>
              <h4 className={`font-extrabold text-lg md:text-xl tracking-tight ${
                activeLeg === 'to_pickup' ? 'text-sky-400' : 'text-copper-400'
              }`}>
                {hasArrivedCurrentLeg ? '0.0 km' : `${remainingDistanceKm.toFixed(1)} km`}
              </h4>
            </div>

            <div className="w-[1px] h-8 bg-loft-800"></div>

            <div>
              <p className="text-xs text-loft-400 font-medium">Leg ETA</p>
              <h4 className="font-extrabold text-lg md:text-xl tracking-tight text-emerald-400">
                {hasArrivedCurrentLeg ? 'Arrived' : `~${remainingDurationMins} mins`}
              </h4>
            </div>
          </div>
        </div>

        {/* Dynamic Route Progress Bar */}
        <div className="mt-3 pt-2 border-t border-loft-800/80">
          <div className="flex justify-between items-center text-[10px] text-loft-400 font-mono mb-1">
            <span>
              {activeLeg === 'to_pickup' ? 'Leg 1 Progress (To Pickup): ' : 'Leg 2 Progress (To Drop-off): '}
              <strong className={activeLeg === 'to_pickup' ? 'text-sky-400 font-bold' : 'text-copper-400 font-bold'}>
                {progressPercent}%
              </strong>
            </span>
            <span>
              {hasArrivedCurrentLeg 
                ? (activeLeg === 'to_pickup' ? 'Ready for Package Verification' : 'Delivery Complete') 
                : `${Math.max(0, activeDenseRoute.length - simIndex)} waypoints remaining`}
            </span>
          </div>
          <div className="w-full h-1.5 bg-loft-950 rounded-full overflow-hidden border border-loft-800">
            <div 
              className={`h-full transition-all duration-150 ease-out ${
                activeLeg === 'to_pickup'
                  ? 'bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400'
                  : 'bg-gradient-to-r from-copper-500 via-amber-400 to-emerald-400'
              }`}
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Interactive Leaflet Map */}
      <div className="relative w-full h-full min-h-[460px] flex-1 z-0">
        <MapContainer
          center={[currentPos.lat, currentPos.lng]}
          zoom={14}
          scrollWheelZoom={true}
          zoomControl={false}
          className="w-full h-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            className="map-tiles"
          />

          <MapCameraController 
            centerPos={currentPos} 
            bounds={mapBounds} 
            autoFollow={autoFollow}
            fitTrigger={fitTrigger}
            onAutoFollowChange={setAutoFollow}
          />

          {/* Moving Tempo Truck Marker (Rotates along road bearing) */}
          <Marker 
            position={[currentPos.lat, currentPos.lng]} 
            icon={createRotatingTruckIcon(simBearing, isSimulating, simSpeedKmh)}
          >
            <Popup>
              <div className="p-1 min-w-[190px]">
                <div className="flex items-center justify-between border-b border-loft-200 pb-1 mb-1.5">
                  <span className="font-bold text-xs text-copper-600">Eminence Tempo Truck</span>
                  <span className="text-[10px] bg-copper-100 text-copper-700 px-1.5 py-0.5 rounded font-bold">
                    {Math.round(simSpeedKmh)} km/h
                  </span>
                </div>
                <p className="text-[11px] text-loft-700">
                  <strong>GPS:</strong> {currentPos.lat.toFixed(5)}, {currentPos.lng.toFixed(5)}
                </p>
                <p className="text-[11px] text-loft-700 mt-0.5">
                  <strong>Heading:</strong> {Math.round(simBearing)}° • {progressPercent}% of {activeLeg === 'to_pickup' ? 'Leg 1' : 'Leg 2'}
                </p>
                <p className="text-[10px] text-emerald-600 font-semibold mt-1">
                  ● {hasArrivedCurrentLeg 
                      ? (activeLeg === 'to_pickup' ? 'Arrived at Pickup Origin' : 'Arrived at Drop-off Destination') 
                      : (activeLeg === 'to_pickup' ? 'Driving to Pickup (Akurdi)' : 'Driving to Destination (Shivajinagar)')}
                </p>
              </div>
            </Popup>
          </Marker>

          {/* Pickup Origin Marker (Phase 1) */}
          {pickupCoord && (
            <Marker 
              position={[pickupCoord.lat, pickupCoord.lng]} 
              icon={createPickupIcon(isPickupVerified)}
            >
              <Popup>
                <div className="p-1 max-w-xs">
                  <span className="font-bold text-xs text-sky-600 block">Stage 1: Pickup Origin</span>
                  <p className="text-xs text-loft-700 mt-0.5">{pickupAddress}</p>
                  <div className="mt-1.5 pt-1 border-t border-loft-200 text-[10px]">
                    Status: <strong className={isPickupVerified ? 'text-emerald-600' : 'text-amber-600'}>
                      {isPickupVerified ? '✓ Verified & Loaded' : 'Awaiting Package Verification'}
                    </strong>
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Destination Drop-off Marker (Phase 2) */}
          {dropCoord && (
            <Marker 
              position={[dropCoord.lat, dropCoord.lng]} 
              icon={createDestinationIcon(hasArrivedDropoff || activeRide?.status === 'completed')}
            >
              <Popup>
                <div className="p-1 max-w-xs">
                  <span className="font-bold text-xs text-copper-600 block">Stage 2: Drop-off Destination</span>
                  <p className="text-xs text-loft-700 mt-0.5">{dropoffAddress}</p>
                  <div className="mt-1.5 pt-1 border-t border-loft-200 text-[10px]">
                    Status: <strong className={hasArrivedDropoff ? 'text-emerald-600' : 'text-loft-600'}>
                      {hasArrivedDropoff ? '✓ Ready for PoD Sign' : 'Destination Point'}
                    </strong>
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* If currently in Phase 1: Show Leg 2 as a subtle Preview Polyline */}
          {activeLeg === 'to_pickup' && leg2Route?.polyline?.length > 1 && (
            <Polyline
              positions={leg2Route.polyline}
              pathOptions={{
                color: '#38bdf8',
                weight: 4,
                opacity: 0.55,
                dashArray: '6, 10',
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />
          )}

          {/* If currently in Phase 2: Show Leg 1 as completed trail */}
          {activeLeg === 'to_dropoff' && leg1Route?.polyline?.length > 1 && (
            <Polyline
              positions={leg1Route.polyline}
              pathOptions={{
                color: '#059669',
                weight: 3.5,
                opacity: 0.7,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />
          )}

          {/* Active Leg Traveled Polyline (Emerald Green) */}
          {activeTraveledPolyline.length > 1 && (
            <Polyline
              positions={activeTraveledPolyline}
              pathOptions={{
                color: '#10b981',
                weight: 6,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />
          )}

          {/* Active Leg Remaining Polyline (Vibrant Copper or Sky Blue) */}
          {activeRemainingPolyline.length > 1 && (
            <Polyline
              positions={activeRemainingPolyline}
              pathOptions={{
                color: activeLeg === 'to_pickup' ? '#0ea5e9' : '#e86331',
                weight: 5,
                opacity: 0.85,
                dashArray: '8, 8',
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />
          )}
        </MapContainer>

        {/* Loading Overlay */}
        {isLoadingRoute && (
          <div className="absolute top-44 left-4 z-[999] bg-loft-950/85 backdrop-blur-md border border-loft-800 text-loft-200 px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 shadow-2xl">
            <div className="w-3.5 h-3.5 border-2 border-copper-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Calculating real road path for two-phase delivery route...</span>
          </div>
        )}

        {/* VERIFICATION 1 MODAL / CARD: Arrived at Pickup Origin */}
        {hasArrivedPickup && !isPickupVerified && (
          <div className="absolute top-44 left-4 right-4 sm:left-auto sm:right-4 z-[1001] bg-gradient-to-r from-sky-950/95 via-loft-950/95 to-sky-950/95 border-2 border-sky-500/50 rounded-2xl p-4 shadow-2xl backdrop-blur-md max-w-md animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400 flex items-center justify-center shrink-0 text-xl">
                📦
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-base text-sky-400">Arrived at Pickup Origin</h4>
                  <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-400/30 px-2 py-0.5 rounded-full font-bold">
                    Verification 1 of 2
                  </span>
                </div>
                <p className="text-xs text-loft-200 mt-1">
                  Tempo truck arrived at <strong>{pickupAddress}</strong>. Verify package pickup with the customer's 4-digit Start Ride OTP.
                </p>

                {/* OTP Input Form */}
                <div className="mt-3 bg-loft-900/90 border border-loft-800 rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-loft-300">
                    <span className="flex items-center gap-1 font-semibold text-loft-100">
                      <ShieldCheck className="w-3.5 h-3.5 text-sky-400" /> Start Ride OTP
                    </span>
                    {(activeRide?.otp || activeRide?.bookingId?.startsWith('demo-sim-')) && (
                      <button
                        type="button"
                        onClick={() => {
                          const testCode = activeRide?.otp || '8492';
                          setMapOtpInput(testCode);
                        }}
                        className="text-[10px] text-sky-400 hover:text-sky-300 underline font-mono cursor-pointer font-semibold"
                      >
                        Autofill OTP ({activeRide?.otp || '8492'})
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={4}
                      value={mapOtpInput}
                      onChange={(e) => {
                        setMapOtpInput(e.target.value.replace(/\D/g, ''));
                        setMapOtpError('');
                      }}
                      placeholder="4-digit OTP"
                      className="w-32 bg-loft-950 border border-loft-700 focus:border-sky-400 text-loft-50 font-mono text-center font-bold tracking-widest text-sm rounded-lg px-2 py-1.5 outline-none"
                    />

                    <button
                      type="button"
                      disabled={isVerifyingMapOtp || mapOtpInput.length !== 4}
                      onClick={() => handleVerifyPickupOtp(mapOtpInput)}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-loft-950 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {isVerifyingMapOtp ? (
                        <span className="w-3 h-3 border-2 border-loft-950 border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <>
                          <span>Verify & Depart</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>

                  {mapOtpError && (
                    <p className="text-[11px] text-red-400 font-medium">{mapOtpError}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VERIFICATION 2 MODAL / CARD: Arrived at Drop-off Destination */}
        {hasArrivedDropoff && activeLeg === 'to_dropoff' && (
          <div className="absolute top-44 left-4 right-4 sm:left-auto sm:right-4 z-[1001] bg-gradient-to-r from-emerald-950/95 via-loft-950/95 to-emerald-950/95 border-2 border-emerald-500/50 rounded-2xl p-4 shadow-2xl backdrop-blur-md max-w-md animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center shrink-0 text-xl">
                🏁
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-base text-emerald-400">Destination Reached!</h4>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold">
                    Verification 2 of 2
                  </span>
                </div>
                <p className="text-xs text-loft-200 mt-1">
                  The tempo truck has arrived at <strong>{dropoffAddress}</strong>. Handover consignment packages to the consignee and record digital Proof of Delivery.
                </p>
                
                <div className="flex items-center gap-2.5 mt-3">
                  {onFinishTrip && (
                    <button
                      type="button"
                      disabled={isFinishingTrip}
                      onClick={onFinishTrip}
                      className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-75 text-loft-950 text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-2"
                    >
                      {isFinishingTrip ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-loft-950 border-t-transparent rounded-full animate-spin"></span>
                          <span>Signing PoD & Completing...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Sign PoD & Complete Delivery</span>
                        </>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleRestart}
                    className="px-3.5 py-2 rounded-xl bg-loft-800 hover:bg-loft-700 text-loft-200 text-xs font-semibold border border-loft-700 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-copper-400" />
                    Replay Leg
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Floating Simulation Control Deck */}
        <div className="absolute bottom-4 left-4 right-4 z-[1000] flex flex-wrap items-center justify-between gap-3 pointer-events-none">
          
          {/* Main Simulation Controls (Play/Pause, Speed, Restart) */}
          <div className="bg-loft-950/95 backdrop-blur-md border border-copper-500/30 p-2 rounded-2xl shadow-2xl flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleTogglePlay();
              }}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-lg transition-all cursor-pointer ${
                isSimulating
                  ? 'bg-amber-500 hover:bg-amber-400 text-loft-950'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-loft-950'
              }`}
            >
              {isSimulating ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-loft-950" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-loft-950" />
                  <span>{hasArrivedCurrentLeg ? 'Replay' : 'Drive'}</span>
                </>
              )}
            </button>

            {/* Speed Multiplier Selector */}
            <div className="flex items-center bg-loft-900 border border-loft-800 rounded-xl p-1 gap-1">
              {[1, 3, 8].map((mult) => (
                <button
                  key={mult}
                  type="button"
                  onClick={() => setSimSpeedMultiplier(mult)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold font-mono transition-all cursor-pointer ${
                    simSpeedMultiplier === mult
                      ? 'bg-copper-500 text-white shadow-sm'
                      : 'text-loft-400 hover:text-loft-200'
                  }`}
                  title={`${mult}x simulation playback speed`}
                >
                  {mult}x
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleRestart}
              title="Restart route from start"
              className="p-2 rounded-xl bg-loft-900 hover:bg-loft-800 text-loft-300 hover:text-copper-400 border border-loft-800 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Right Map Actions (Auto-Follow Camera, Fit Route, Google Maps) */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={() => setAutoFollow(prev => !prev)}
              title={autoFollow ? 'Auto-follow camera locked on tempo' : 'Free map pan (click to re-lock)'}
              className={`p-2.5 rounded-xl border shadow-xl backdrop-blur-md transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                autoFollow
                  ? 'bg-copper-500/20 border-copper-400 text-copper-300'
                  : 'bg-loft-900/90 hover:bg-loft-800 text-loft-300 border-loft-700/80'
              }`}
            >
              <Compass className={`w-4 h-4 ${autoFollow ? 'text-copper-400 animate-spin' : 'text-loft-400'}`} />
              <span className="hidden sm:inline">{autoFollow ? 'Camera Lock' : 'Free Pan'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAutoFollow(false);
                setFitTrigger(prev => prev + 1);
              }}
              title="Fit entire route on screen"
              className="p-2.5 bg-loft-900/90 hover:bg-loft-800 text-loft-100 hover:text-copper-400 border border-loft-700/80 rounded-xl shadow-xl backdrop-blur-md transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              <Maximize2 className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Overview</span>
            </button>

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={`Open turn-by-turn navigation in Google Maps (${activeLeg === 'to_pickup' ? 'to Pickup' : 'to Drop-off'})`}
              className="p-2.5 bg-copper-500 hover:bg-copper-400 text-loft-950 rounded-xl shadow-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Google Maps</span>
            </a>
          </div>

        </div>

      </div>

      <style>{`
        @keyframes tempoRadar {
          0% {
            transform: scale(0.8);
            opacity: 0.9;
          }
          100% {
            transform: scale(1.6);
            opacity: 0;
          }
        }
        .map-tiles {
          filter: brightness(0.78) invert(1) contrast(3) hue-rotate(200deg) saturate(0.35);
        }
      `}</style>
    </div>
  );
};

export default DriverNavigationMap;
