const axios = require('axios');
const getOsrmBaseUrl = () => (process.env.OSRM_BASE_URL || 'https://router.project-osrm.org').replace(/\/$/, '');

/**
 * Helper to calculate simple distance (as the crow flies) for fallback
 */
const calculateDistance = (point1, point2) => {
  const R = 6371; // km
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLon = (point2.lng - point1.lng) * Math.PI / 180;
  const lat1 = point1.lat * Math.PI / 180;
  const lat2 = point2.lat * Math.PI / 180;

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
};

const hasCoordinates = (point) =>
  Number.isFinite(Number(point?.lat)) &&
  Number(point.lat) >= -90 &&
  Number(point.lat) <= 90 &&
  Number.isFinite(Number(point?.lng)) &&
  Number(point.lng) >= -180 &&
  Number(point.lng) <= 180;

/**
 * Optimizes a route using OSRM Trip API or fallbacks to Nearest Neighbor.
 * @param {Object} startPoint { lat, lng }
 * @param {Array} waypoints [{ id, lat, lng, address }, ...]
 * @returns {Promise<Array>} Optimized ordered waypoints
 */
const optimizeRoute = async (startPoint, waypoints) => {
  if (!waypoints || waypoints.length === 0) return [];

  // Validate all points
  const allPoints = [startPoint, ...waypoints];
  const allValid = allPoints.every(hasCoordinates);

  if (!allValid) {
    throw new Error("Cannot optimize route: missing or invalid geocoded coordinates.");
  }
  if (waypoints.length === 1) return waypoints;

  try {
    // Format coordinates for OSRM: lon,lat;lon,lat
    const coordsString = allPoints.map(p => `${p.lng},${p.lat}`).join(';');
    
    const response = await axios.get(`${getOsrmBaseUrl()}/trip/v1/driving/${coordsString}`, {
      params: {
        source: 'first',
        roundtrip: 'false',
        geometries: 'geojson',
      },
      timeout: 5000, // Handle timeouts gracefully
    });

    if (response.data && response.data.code === 'Ok' && response.data.waypoints) {
      const osrmWaypoints = response.data.waypoints;
      
      // OSRM returns waypoints in optimized order via waypoint_index
      // Index 0 is always the startPoint (because source='first')
      // Map OSRM ordered waypoints back to our original waypoints array
      
      // Filter out the start point from OSRM's response to only sort dropoffs
      // Sort the original waypoints array based on OSRM's waypoint_index
      const sortedOriginalWaypoints = [...waypoints].sort((a, b) => {
        // Find index of 'a' in the original allPoints array
        const aOrigIdx = allPoints.indexOf(a);
        const bOrigIdx = allPoints.indexOf(b);
        
        // Find their assigned waypoint_index in OSRM
        // OSRM returns waypoints in input order. Some compatible providers also
        // include original_index; support both response shapes.
        const aOsrm = osrmWaypoints.find(wp => wp.original_index === aOrigIdx) || osrmWaypoints[aOrigIdx];
        const bOsrm = osrmWaypoints.find(wp => wp.original_index === bOrigIdx) || osrmWaypoints[bOrigIdx];

        if (!aOsrm || !bOsrm || !Number.isFinite(aOsrm.waypoint_index) || !Number.isFinite(bOsrm.waypoint_index)) {
          throw new Error('OSRM response did not include usable waypoint indexes');
        }
        
        return aOsrm.waypoint_index - bOsrm.waypoint_index;
      });

      // Calculate leg distances from the OSRM trips/legs
      let currentPos = startPoint;
      sortedOriginalWaypoints.forEach((wp, idx) => {
        // OSRM legs array matches the route between ordered waypoints
        const leg = response.data.trips[0].legs[idx];
        if (leg && leg.distance) {
          wp.legDistance = Math.round((leg.distance / 1000) * 10) / 10; // Convert meters to km
          wp.duration = leg.duration; // in seconds
        } else {
           wp.legDistance = Math.round(calculateDistance(currentPos, wp) * 10) / 10;
        }
        currentPos = wp;
      });

      return sortedOriginalWaypoints;
    }
  } catch (error) {
    console.warn("[Route Optimizer] OSRM routing failed, falling back to Euclidean nearest neighbor.", error.message);
  }

  // Fallback: Nearest Neighbor algorithm using Euclidean distance if OSRM fails
  const unvisited = [...waypoints];
  const optimized = [];
  let currentPos = startPoint;

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let minDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      let dist = calculateDistance(currentPos, unvisited[i]);

      if (dist < minDistance) {
        minDistance = dist;
        nearestIdx = i;
      }
    }

    const nextStop = unvisited.splice(nearestIdx, 1)[0];
    nextStop.legDistance = Math.round(minDistance * 10) / 10;
    nextStop.duration = Math.round((nextStop.legDistance / 40) * 3600); // Rough estimate 40km/h
    nextStop.isFallback = true;
    optimized.push(nextStop);
    currentPos = nextStop;
  }

  return optimized;
};

/**
 * Calculates real driving distance between two points via OSRM,
 * falling back to Haversine * 1.32 (realistic urban road winding coefficient).
 * @param {{ lat: number, lng: number }} startPoint
 * @param {{ lat: number, lng: number }} endPoint
 * @returns {Promise<number>} distance in km
 */
const getRouteDistance = async (startPoint, endPoint) => {
  if (!startPoint || !endPoint) return 5.0;
  const lat1 = parseFloat(startPoint.lat);
  const lng1 = parseFloat(startPoint.lng);
  const lat2 = parseFloat(endPoint.lat);
  const lng2 = parseFloat(endPoint.lng);

  if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) return 5.0;

  const crowFlies = calculateDistance({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 });
  if (crowFlies < 0.1) return 1.0;

  try {
    const url = `${getOsrmBaseUrl()}/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=false`;
    const response = await axios.get(url, { timeout: 4000 });
    if (response.data && response.data.code === 'Ok' && response.data.routes && response.data.routes.length > 0) {
      const roadKm = response.data.routes[0].distance / 1000;
      if (roadKm > 0) {
        return parseFloat(roadKm.toFixed(1));
      }
    }
  } catch (err) {
    console.warn('[Route Optimizer] OSRM distance lookup failed, falling back to urban winding factor:', err.message);
  }

  // Realistic Pune urban road factor (1.32x crow-flies distance)
  return parseFloat(Math.max(1.0, crowFlies * 1.32).toFixed(1));
};

module.exports = {
  optimizeRoute,
  calculateDistance,
  getRouteDistance
};
