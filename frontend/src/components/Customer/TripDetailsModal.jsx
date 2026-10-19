import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  X, MapPin, Truck, ShieldCheck, Check, Copy, Phone, 
  Clock, Navigation, Star, ArrowRight, ExternalLink, Shield, 
  FileCheck, AlertTriangle, Layers, Calendar, Download, FileText
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { geocodeAddress, fetchOsrmRoute } from '../../utils/puneGeocoder';

// Custom Map Pin Icons
const createPinIcon = (label, isPickup = true) => {
  const bg = isPickup ? '#10b981' : '#e86331';
  const shadow = isPickup ? 'rgba(16, 185, 129, 0.45)' : 'rgba(232, 99, 49, 0.45)';
  return L.divIcon({
    className: 'custom-details-pin',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center;">
        <div style="
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: ${bg};
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 12px;
          box-shadow: 0 4px 12px ${shadow};
          border: 2px solid #ffffff;
        ">
          ${label}
        </div>
        <div style="width: 2px; height: 5px; background: ${bg};"></div>
      </div>
    `,
    iconSize: [28, 36],
    iconAnchor: [14, 36]
  });
};

// Map auto-fit component
const AutoFitBounds = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    if (!positions || positions.length < 2) return;
    try {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [35, 35], maxZoom: 14, animate: false });
    } catch (e) {
      console.warn('Map bounds fit notice:', e);
    }
  }, [positions, map]);
  return null;
};

const TripDetailsModal = ({ trip, isOpen, onClose, onCancelBooking, onDownloadInvoice }) => {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [copiedPod, setCopiedPod] = useState(false);

  // Routing State for Mini Map
  const [pickupCoord, setPickupCoord] = useState(null);
  const [dropCoord, setDropCoord] = useState(null);
  const [routePolyline, setRoutePolyline] = useState([]);
  const [routeDistanceKm, setRouteDistanceKm] = useState(null);
  const [isMapLoading, setIsMapLoading] = useState(true);

  // Fallback Pune coordinates
  const PUNE_DEFAULT = [18.5204, 73.8567];

  useEffect(() => {
    if (!trip || !isOpen) return;

    let isMounted = true;
    setIsMapLoading(true);

    const resolveRoute = async () => {
      try {
        // 1. Pickup Coordinates
        let pCoord = null;
        if (trip.pickupLat && trip.pickupLng) {
          pCoord = { lat: Number(trip.pickupLat), lng: Number(trip.pickupLng) };
        } else if (trip.pickupAddress) {
          pCoord = await geocodeAddress(trip.pickupAddress);
        }

        // 2. Drop Coordinates
        let dCoord = null;
        if (trip.dropLat && trip.dropLng) {
          dCoord = { lat: Number(trip.dropLat), lng: Number(trip.dropLng) };
        } else if (trip.stops && Array.isArray(trip.stops) && trip.stops.length > 0) {
          const lastStop = trip.stops[trip.stops.length - 1];
          if (lastStop?.lat && lastStop?.lng) {
            dCoord = { lat: Number(lastStop.lat), lng: Number(lastStop.lng) };
          }
        }
        if (!dCoord && trip.dropAddress) {
          dCoord = await geocodeAddress(trip.dropAddress);
        }

        if (!isMounted) return;
        if (pCoord) setPickupCoord(pCoord);
        if (dCoord) setDropCoord(dCoord);

        // Fetch turn-by-turn road route
        if (pCoord && dCoord) {
          const routeRes = await fetchOsrmRoute([pCoord, dCoord]);
          if (isMounted && routeRes?.polyline) {
            setRoutePolyline(routeRes.polyline);
            if (routeRes.distanceKm) setRouteDistanceKm(routeRes.distanceKm);
          }
        }
      } catch (err) {
        console.warn('TripDetails mini map notice:', err);
      } finally {
        if (isMounted) setIsMapLoading(false);
      }
    };

    resolveRoute();

    return () => {
      isMounted = false;
    };
  }, [trip, isOpen]);

  if (!isOpen || !trip) return null;

  const shortId = trip.id ? `#${trip.id.slice(0, 8).toUpperCase()}` : '#BOOKING';
  const displayOtp = trip.otp || '4928';

  const copyToClipboard = (text, type) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else if (type === 'otp') {
      setCopiedOtp(true);
      setTimeout(() => setCopiedOtp(false), 2000);
    } else if (type === 'pod') {
      setCopiedPod(true);
      setTimeout(() => setCopiedPod(false), 2000);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return { text: 'FINDING DRIVER', bg: 'bg-sky-500/15 text-sky-400 border-sky-500/30' };
      case 'driver_assigned':
        return { text: 'DRIVER APPOINTED', bg: 'bg-blue-500/15 text-blue-300 border-blue-500/30' };
      case 'arrived':
        return { text: 'TEMPO AT PICKUP', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
      case 'in_transit':
        return { text: 'IN TRANSIT', bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
      case 'completed':
        return { text: 'DELIVERED', bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
      case 'expired':
        return { text: 'EXPIRED', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
      case 'cancelled':
        return { text: 'CANCELLED', bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30' };
      default:
        return { text: (status || 'ACTIVE').toUpperCase(), bg: 'bg-loft-800 text-loft-200 border-loft-700' };
    }
  };

  const statusBadge = getStatusBadge(trip.status);
  const formattedDate = trip.date
    ? new Date(trip.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : (trip.createdAt ? new Date(trip.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today');

  const formattedTime = trip.time
    ? trip.time
    : (trip.createdAt ? new Date(trip.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');

  const mapPositions = [];
  if (pickupCoord) mapPositions.push([pickupCoord.lat, pickupCoord.lng]);
  if (dropCoord) mapPositions.push([dropCoord.lat, dropCoord.lng]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-loft-950/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-xl bg-loft-950 border border-loft-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col my-auto max-h-[92vh]"
      >
        {/* Real Interactive Mini Route Map */}
        <div className="relative h-52 sm:h-56 w-full bg-loft-900 overflow-hidden border-b border-loft-800 shrink-0">
          {mapPositions.length >= 2 ? (
            <MapContainer
              center={mapPositions[0]}
              zoom={12}
              scrollWheelZoom={false}
              zoomControl={false}
              dragging={false}
              className="w-full h-full z-0"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                className="map-tiles"
              />
              <AutoFitBounds positions={mapPositions} />

              {/* Road polyline */}
              {routePolyline.length > 0 && (
                <Polyline
                  positions={routePolyline}
                  pathOptions={{
                    color: '#e86331',
                    weight: 4.5,
                    opacity: 0.9,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }}
                />
              )}

              {/* Point A Marker */}
              {pickupCoord && (
                <Marker position={[pickupCoord.lat, pickupCoord.lng]} icon={createPinIcon('A', true)} />
              )}

              {/* Point B Marker */}
              {dropCoord && (
                <Marker position={[dropCoord.lat, dropCoord.lng]} icon={createPinIcon('B', false)} />
              )}
            </MapContainer>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-loft-900 to-loft-950 text-center p-4">
              <div className="w-10 h-10 rounded-full bg-copper-500/20 border border-copper-500/30 flex items-center justify-center mb-2 animate-pulse">
                <MapPin className="w-5 h-5 text-copper-400" />
              </div>
              <p className="text-xs font-semibold text-loft-200">
                {isMapLoading ? 'Loading real road map...' : `${trip.pickupAddress || 'Pune'} → ${trip.dropAddress || 'Destination'}`}
              </p>
              <p className="text-[11px] text-loft-400 mt-0.5">
                {routeDistanceKm || trip.totalDistance ? `${routeDistanceKm || trip.totalDistance} km scheduled route` : 'Intracity Transit Route'}
              </p>
            </div>
          )}

          {/* Top Floating Overlay Pills */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-[400] pointer-events-none">
            <span className={`text-[10px] font-mono font-bold px-3 py-1 rounded-full border shadow-lg backdrop-blur-md uppercase tracking-wider ${statusBadge.bg}`}>
              {statusBadge.text}
            </span>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-loft-950/80 hover:bg-loft-800 text-loft-300 hover:text-white border border-loft-700/80 flex items-center justify-center transition-all shadow-xl pointer-events-auto cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Route Distance Badge */}
          {(routeDistanceKm || trip.totalDistance) && (
            <div className="absolute bottom-3 left-3 z-[400] bg-loft-950/90 border border-loft-700/80 backdrop-blur-md px-3 py-1 rounded-xl text-xs font-mono font-bold text-copper-300 flex items-center gap-1.5 shadow-lg">
              <Navigation className="w-3.5 h-3.5 text-copper-400" />
              <span>{routeDistanceKm || trip.totalDistance} km</span>
            </div>
          )}
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Header Row: ID, Date & OTP */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-loft-800/80">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold font-mono text-loft-50 tracking-tight">
                  {shortId}
                </h3>
                <button
                  type="button"
                  onClick={() => copyToClipboard(trip.id, 'id')}
                  className="p-1 rounded-lg bg-loft-900 hover:bg-loft-800 text-loft-400 hover:text-loft-100 transition-colors text-xs flex items-center gap-1 cursor-pointer"
                  title="Copy full Booking UUID"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="text-[10px]">{copiedId ? 'Copied' : 'UUID'}</span>
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-loft-400 mt-1 font-sans">
                <Calendar className="w-3.5 h-3.5 text-loft-400" />
                <span>{formattedDate}</span>
                {formattedTime && (
                  <>
                    <span>•</span>
                    <Clock className="w-3.5 h-3.5 text-loft-400" />
                    <span>{formattedTime}</span>
                  </>
                )}
              </div>
            </div>

            {/* OTP Pill (Active trips only) */}
            {trip.status !== 'completed' && trip.status !== 'cancelled' && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2 flex items-center gap-3">
                <div>
                  <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Ride OTP
                  </p>
                  <span className="text-lg font-mono font-extrabold text-loft-50 tracking-widest block">
                    {displayOtp}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(displayOtp, 'otp')}
                  className="p-1.5 rounded-lg bg-loft-900 hover:bg-loft-800 text-loft-300 hover:text-white transition-colors cursor-pointer"
                  title="Copy Start OTP"
                >
                  {copiedOtp ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>

          {/* Cancellation Notice if Cancelled */}
          {trip.cancellationReason && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-200">Trip Cancelled</p>
                <p className="text-rose-300/90 mt-0.5">{trip.cancellationReason}</p>
              </div>
            </div>
          )}

          {/* Route Section */}
          <div className="bg-loft-900/60 rounded-2xl p-4 border border-loft-800/80 space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-loft-400">Route Details</h4>
            
            {/* Origin */}
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[11px] font-bold text-emerald-400">A</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Pickup Origin</p>
                <p className="text-xs font-semibold text-loft-100 mt-0.5 leading-relaxed">
                  {trip.pickupAddress || trip.from || 'Pickup Location, Pune'}
                </p>
              </div>
            </div>

            {/* Connecting Line */}
            <div className="ml-3 w-0.5 h-4 bg-gradient-to-b from-emerald-500 to-copper-500"></div>

            {/* Destination */}
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-copper-500/20 border border-copper-500/40 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[11px] font-bold text-copper-400">B</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-copper-400">Delivery Destination</p>
                <p className="text-xs font-semibold text-loft-100 mt-0.5 leading-relaxed">
                  {trip.dropAddress || trip.to || 'Drop Destination, Pune'}
                </p>
              </div>
            </div>
          </div>

          {/* Assigned Driver Card */}
          {trip.driver ? (
            <div className="bg-loft-900/60 rounded-2xl p-4 border border-loft-800/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-copper-500/15 border border-copper-500/30 flex items-center justify-center text-xl shrink-0">
                  👨‍✈️
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-loft-400">Fleet Partner Driver</p>
                  <h5 className="text-sm font-bold text-loft-50">{trip.driver.name}</h5>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-amber-400">
                    <span className="flex items-center gap-1 font-bold">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {trip.driver.rating ? Number(trip.driver.rating).toFixed(1) : '4.9'}
                    </span>
                    {trip.vehicle?.registrationNumber && (
                      <span className="text-loft-400 font-mono text-[11px]">
                        • {trip.vehicle.registrationNumber}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {trip.driver.phone && (
                <a
                  href={`tel:${trip.driver.phone}`}
                  className="p-2.5 rounded-xl bg-copper-500 hover:bg-copper-400 text-loft-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                  title="Call Driver"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Call Driver</span>
                </a>
              )}
            </div>
          ) : (
            <div className="bg-loft-900/40 rounded-2xl p-3.5 border border-loft-800/80 flex items-center gap-3 text-xs text-loft-300">
              <Truck className="w-4 h-4 text-copper-400 shrink-0" />
              <span>
                {trip.status === 'pending'
                  ? 'Nearest verified fleet tempo is being appointed...'
                  : 'Fleet vehicle assigned for this delivery route.'}
              </span>
            </div>
          )}

          {/* Consignment & Vehicle Specs Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-loft-900/60 border border-loft-800">
              <span className="text-[10px] text-loft-400 block mb-0.5">Tempo Type</span>
              <span className="font-bold text-loft-100 capitalize">
                {trip.vehicle?.type || trip.tempoType || 'Medium Tempo'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-loft-900/60 border border-loft-800">
              <span className="text-[10px] text-loft-400 block mb-0.5">Cargo Weight</span>
              <span className="font-bold text-loft-100">
                {trip.weight ? `${trip.weight} kg` : 'Standard'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-loft-900/60 border border-loft-800">
              <span className="text-[10px] text-loft-400 block mb-0.5">Goods Type</span>
              <span className="font-bold text-loft-100 truncate block">
                {trip.goodsType || trip.cargoType || 'Commercial Goods'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-loft-900/60 border border-loft-800">
              <span className="text-[10px] text-loft-400 block mb-0.5">Payment</span>
              <span className="font-bold text-emerald-400 uppercase text-[11px]">
                {trip.paymentMethod || 'Wallet'}
              </span>
            </div>
          </div>

          {/* Blockchain Proof of Delivery (PoD) if completed */}
          {trip.podHash && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4" /> Blockchain PoD Verified
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(trip.podHash, 'pod')}
                  className="text-[10px] text-emerald-300 hover:underline flex items-center gap-1 font-mono cursor-pointer"
                >
                  {copiedPod ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedPod ? 'Copied' : 'Copy Hash'}</span>
                </button>
              </div>
              <p className="font-mono text-[10px] text-loft-300 break-all bg-loft-950/80 p-2 rounded-lg border border-emerald-500/20">
                {trip.podHash}
              </p>
            </div>
          )}

          {/* Transparent Fare Breakdown */}
          <div className="bg-loft-900/60 rounded-2xl p-4 border border-loft-800/80 space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-loft-400 mb-2">Fare Breakdown</h4>
            <div className="flex justify-between text-xs text-loft-300">
              <span>Trip Base Rate & Distance</span>
              <span>₹{parseFloat(trip.estimatedFare || trip.amount || 0).toLocaleString('en-IN')}</span>
            </div>
            {trip.waitingFee && Number(trip.waitingFee) > 0 && (
              <div className="flex justify-between text-xs text-loft-300">
                <span>Waiting Fee</span>
                <span>₹{parseFloat(trip.waitingFee).toLocaleString('en-IN')}</span>
              </div>
            )}
            {trip.insuranceFee && Number(trip.insuranceFee) > 0 && (
              <div className="flex justify-between text-xs text-loft-300">
                <span>Transit Insurance</span>
                <span>₹{parseFloat(trip.insuranceFee).toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="pt-2 border-t border-loft-800 flex justify-between items-center text-sm font-bold text-loft-50">
              <span>Total Paid Amount</span>
              <span className="text-copper-400 font-mono text-base">
                ₹{parseFloat(trip.estimatedFare || trip.amount || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="p-4 sm:p-5 bg-loft-900/90 border-t border-loft-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {trip.status === 'pending' && onCancelBooking ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onCancelBooking(trip);
              }}
              className="py-2.5 px-4 rounded-xl border border-rose-500/40 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Cancel Booking
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl bg-loft-800 hover:bg-loft-700 text-loft-200 text-xs font-semibold border border-loft-700 transition-colors cursor-pointer"
              >
                Close Details
              </button>
              {trip.status === 'completed' && onDownloadInvoice && (
                <button
                  type="button"
                  onClick={() => onDownloadInvoice(trip.id, false)}
                  className="py-2.5 px-4 rounded-xl border border-copper-500/40 bg-copper-500/15 hover:bg-copper-500/25 text-copper-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Download Official Tax Receipt & Invoice"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Receipt</span>
                </button>
              )}
            </div>
          )}

          <Link
            to={`/tracking/${trip.id}`}
            onClick={onClose}
            className="py-2.5 px-5 rounded-xl bg-copper-500 hover:bg-copper-400 text-loft-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-copper-500/20 transition-all cursor-pointer ml-auto"
          >
            <span>Open Live GPS Radar & Map</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default TripDetailsModal;
