/**
 * routeOptimizer.js
 * 
 * Simulates a multi-stop routing engine (Traveling Salesperson Problem).
 * Given a pickup location and an array of dropoff locations, this will sort
 * the dropoffs in the most efficient order based on simulated Euclidean distance.
 */

// Helper to calculate simple distance (as the crow flies)
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

/**
 * Optimizes a route using Nearest Neighbor algorithm.
 * @param {Object} startPoint { lat, lng }
 * @param {Array} waypoints [{ id, lat, lng, address }, ...]
 * @returns {Array} Optimized ordered waypoints
 */
const optimizeRoute = (startPoint, waypoints) => {
  if (!waypoints || waypoints.length === 0) return [];
  if (waypoints.length === 1) return waypoints;

  const unvisited = [...waypoints];
  const optimized = [];
  let currentPos = startPoint;

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let minDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      // If lat/lng are missing (e.g. standard address strings without geocoding), 
      // we generate a mock distance to simulate the optimization engine working
      let dist = 0;
      if (unvisited[i].lat && unvisited[i].lng && currentPos.lat && currentPos.lng) {
        dist = calculateDistance(currentPos, unvisited[i]);
      } else {
        dist = Math.random() * 20; // Simulated 0-20km distance
      }

      if (dist < minDistance) {
        minDistance = dist;
        nearestIdx = i;
      }
    }

    const nextStop = unvisited.splice(nearestIdx, 1)[0];
    nextStop.legDistance = Math.round(minDistance * 10) / 10;
    optimized.push(nextStop);
    currentPos = nextStop;
  }

  return optimized;
};

module.exports = {
  optimizeRoute,
  calculateDistance
};
