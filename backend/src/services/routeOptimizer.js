const axios = require('axios');

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
  Number.isFinite(Number(point?.lng));

/**
 * Optimizes a route using OSRM Trip API or fallbacks to Nearest Neighbor.
 * @param {Object} startPoint { lat, lng }
 * @param {Array} waypoints [{ id, lat, lng, address }, ...]
 * @returns {Promise<Array>} Optimized ordered waypoints
 */
const optimizeRoute = async (startPoint, waypoints) => {
  if (!waypoints || waypoints.length === 0) return [];
  if (waypoints.length === 1) return waypoints;

  // Validate all points
  const allPoints = [startPoint, ...waypoints];
  const allValid = allPoints.every(hasCoordinates);

  if (!allValid) {
    throw new Error("Cannot optimize route: missing or invalid geocoded coordinates.");
  }

  try {
    // Format coordinates for OSRM: lon,lat;lon,lat
    const coordsString = allPoints.map(p => `${p.lng},${p.lat}`).join(';');
    
    // Call OSRM Trip API (Public Demo Server)
    // Note: Public OSRM API is for demo/development only. 
    // It restricts requests and may timeout, but perfectly fits an MVP.
    const response = await axios.get(`http://router.project-osrm.org/trip/v1/driving/${coordsString}`, {
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
      const dropoffWaypoints = osrmWaypoints.filter(wp => wp.waypoint_index > 0);
      
      // Sort the original waypoints array based on OSRM's waypoint_index
      const sortedOriginalWaypoints = [...waypoints].sort((a, b) => {
        // Find index of 'a' in the original allPoints array
        const aOrigIdx = allPoints.indexOf(a);
        const bOrigIdx = allPoints.indexOf(b);
        
        // Find their assigned waypoint_index in OSRM
        const aOsrm = osrmWaypoints.find(wp => wp.original_index === aOrigIdx);
        const bOsrm = osrmWaypoints.find(wp => wp.original_index === bOrigIdx);
        
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

module.exports = {
  optimizeRoute,
  calculateDistance
};
