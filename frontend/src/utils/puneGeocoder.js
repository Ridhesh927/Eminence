/**
 * Pune & PCMC Metropolitan Area (PMRDA) Intelligent Geocoder & Address Parser
 * Enables high-accuracy mapping for private residential addresses, home units,
 * colloquial directions ("behind the back", "near"), and specific Pune landmarks.
 */

export const KNOWN_PUNE_LOCATIONS = {
  // Landmarks, Showrooms & Institutions
  'sai maruti': { lat: 18.5195, lng: 73.8448, name: 'Sai Service Maruti Showroom, JM Road' },
  'sai service': { lat: 18.5195, lng: 73.8448, name: 'Sai Service Maruti Showroom, JM Road' },
  'sp kaanara': { lat: 18.5190, lng: 73.8445, name: 'SP Kaanara, JM Road' },
  'brihan maharashtra': { lat: 18.5209, lng: 73.8354, name: 'BMCC College, Deccan' },
  'bmcc': { lat: 18.5209, lng: 73.8354, name: 'BMCC College, Deccan' },
  'coep': { lat: 18.5290, lng: 73.8560, name: 'COEP Tech University, Shivajinagar' },
  'pune station': { lat: 18.5284, lng: 73.8744, name: 'Pune Railway Station' },
  'pune railway': { lat: 18.5284, lng: 73.8744, name: 'Pune Railway Station' },
  'shivajinagar station': { lat: 18.5314, lng: 73.8446, name: 'Shivajinagar Station' },
  'shaniwar wada': { lat: 18.5195, lng: 73.8553, name: 'Shaniwar Wada' },
  'dagdusheth': { lat: 18.5165, lng: 73.8560, name: 'Dagdusheth Ganpati' },
  'swargate bus': { lat: 18.5018, lng: 73.8586, name: 'Swargate Bus Station' },
  'pune airport': { lat: 18.5822, lng: 73.9197, name: 'Pune International Airport, Lohegaon' },
  'bjs school': { lat: 18.5815, lng: 73.9860, name: 'BJS School, Bakori Road, Wagholi' },
  'bjs college': { lat: 18.5815, lng: 73.9860, name: 'BJS College, Wagholi' },
  'bjs': { lat: 18.5815, lng: 73.9860, name: 'BJS School, Wagholi' },
  'bakori road': { lat: 18.5830, lng: 73.9880, name: 'Bakori Road, Wagholi' },
  'bakori': { lat: 18.5830, lng: 73.9880, name: 'Bakori Road, Wagholi' },

  // Roads & Corridors
  'jm road': { lat: 18.5191, lng: 73.8451, name: 'JM Road (Jangali Maharaj Road)' },
  'jangali maharaj': { lat: 18.5191, lng: 73.8451, name: 'JM Road (Jangali Maharaj Road)' },
  'fc road': { lat: 18.5246, lng: 73.8419, name: 'FC Road (Fergusson College Road)' },
  'fergusson': { lat: 18.5246, lng: 73.8419, name: 'FC Road (Fergusson College Road)' },
  'sb road': { lat: 18.5323, lng: 73.8315, name: 'Senapati Bapat Road' },
  'senapati bapat': { lat: 18.5323, lng: 73.8315, name: 'Senapati Bapat Road' },
  'karve road': { lat: 18.5020, lng: 73.8240, name: 'Karve Road' },
  'paud road': { lat: 18.5070, lng: 73.8050, name: 'Paud Road, Kothrud' },
  'law college': { lat: 18.5160, lng: 73.8310, name: 'Law College Road' },
  'bhandarkar': { lat: 18.5180, lng: 73.8330, name: 'Bhandarkar Road' },
  'prabhat road': { lat: 18.5130, lng: 73.8350, name: 'Prabhat Road' },
  'tilak road': { lat: 18.5040, lng: 73.8510, name: 'Tilak Road' },
  'laxmi road': { lat: 18.5150, lng: 73.8540, name: 'Laxmi Road' },
  'kumthekar': { lat: 18.5140, lng: 73.8510, name: 'Kumthekar Road' },
  'bajirao road': { lat: 18.5120, lng: 73.8530, name: 'Bajirao Road' },
  'sinhagad road': { lat: 18.4720, lng: 73.8290, name: 'Sinhagad Road' },
  'satara road': { lat: 18.4750, lng: 73.8600, name: 'Satara Road' },
  'solapur road': { lat: 18.5020, lng: 73.9030, name: 'Solapur Road' },
  'nagar road': { lat: 18.5580, lng: 73.9180, name: 'Ahmednagar Road' },
  'mumbai pune highway': { lat: 18.6100, lng: 73.8150, name: 'Mumbai-Pune Highway' },
  'old mumbai pune': { lat: 18.6100, lng: 73.8150, name: 'Old Mumbai-Pune Highway' },
  'dp road': { lat: 18.5600, lng: 73.8080, name: 'DP Road, Aundh' },
  'gdp road': { lat: 18.5204, lng: 73.8967, name: 'GDP Road, Ghorpuri' },
  'mg road': { lat: 18.5170, lng: 73.8820, name: 'MG Road, Camp' },
  'east street': { lat: 18.5150, lng: 73.8840, name: 'East Street, Camp' },
  'bund garden': { lat: 18.5340, lng: 73.8810, name: 'Bund Garden Road' },
  'boat club': { lat: 18.5360, lng: 73.8830, name: 'Boat Club Road' },

  // Key Suburbs & Localities
  'ghorpuri': { lat: 18.5204, lng: 73.8967, name: 'Ghorpuri' },
  'deccan gymkhana': { lat: 18.5173, lng: 73.8415, name: 'Deccan Gymkhana' },
  'deccan': { lat: 18.5193, lng: 73.8341, name: 'Deccan' },
  'shivajinagar': { lat: 18.5314, lng: 73.8446, name: 'Shivajinagar' },
  'koregaon park': { lat: 18.5362, lng: 73.8940, name: 'Koregaon Park' },
  'kalyani nagar': { lat: 18.5477, lng: 73.9037, name: 'Kalyani Nagar' },
  'viman nagar': { lat: 18.5679, lng: 73.9143, name: 'Viman Nagar' },
  'hadapsar': { lat: 18.5089, lng: 73.9259, name: 'Hadapsar' },
  'magarpatta': { lat: 18.5158, lng: 73.9272, name: 'Magarpatta City' },
  'kharadi': { lat: 18.5516, lng: 73.9348, name: 'Kharadi' },
  'wagholi': { lat: 18.5806, lng: 73.9833, name: 'Wagholi' },
  'hinjewadi phase 1': { lat: 18.5913, lng: 73.7389, name: 'Hinjewadi Phase 1' },
  'hinjewadi phase 2': { lat: 18.5870, lng: 73.7220, name: 'Hinjewadi Phase 2' },
  'hinjewadi phase 3': { lat: 18.5780, lng: 73.6990, name: 'Hinjewadi Phase 3' },
  'hinjewadi': { lat: 18.5913, lng: 73.7389, name: 'Hinjewadi' },
  'wakad': { lat: 18.5987, lng: 73.7687, name: 'Wakad' },
  'baner': { lat: 18.5590, lng: 73.7868, name: 'Baner' },
  'balewadi': { lat: 18.5730, lng: 73.7780, name: 'Balewadi' },
  'aundh': { lat: 18.5580, lng: 73.8075, name: 'Aundh' },
  'pashan': { lat: 18.5410, lng: 73.7920, name: 'Pashan' },
  'bavdhan': { lat: 18.5120, lng: 73.7740, name: 'Bavdhan' },
  'kothrud': { lat: 18.5074, lng: 73.8077, name: 'Kothrud' },
  'karve nagar': { lat: 18.4910, lng: 73.8180, name: 'Karve Nagar' },
  'warje': { lat: 18.4842, lng: 73.7996, name: 'Warje' },
  'swargate': { lat: 18.5018, lng: 73.8586, name: 'Swargate' },
  'katraj': { lat: 18.4575, lng: 73.8677, name: 'Katraj' },
  'kondhwa': { lat: 18.4740, lng: 73.8900, name: 'Kondhwa' },
  'wanowrie': { lat: 18.4920, lng: 73.8990, name: 'Wanowrie' },
  'camp': { lat: 18.5167, lng: 73.8833, name: 'Pune Camp' },
  'fatima nagar': { lat: 18.5030, lng: 73.8980, name: 'Fatima Nagar' },
  'bhosari': { lat: 18.6298, lng: 73.8453, name: 'Bhosari MIDC' },
  'pimpri': { lat: 18.6279, lng: 73.8009, name: 'Pimpri' },
  'chinchwad': { lat: 18.6298, lng: 73.7820, name: 'Chinchwad' },
  'nigdi': { lat: 18.6540, lng: 73.7749, name: 'Nigdi' },
  'akurdi': { lat: 18.6470, lng: 73.7720, name: 'Akurdi' },
  'ravet': { lat: 18.6473, lng: 73.7381, name: 'Ravet' },
  'tathawade': { lat: 18.6161, lng: 73.7483, name: 'Tathawade' },
  'chakan': { lat: 18.7606, lng: 73.8567, name: 'Chakan' },
  'yerawada': { lat: 18.5529, lng: 73.8797, name: 'Yerawada' },
  'dhanori': { lat: 18.5866, lng: 73.8878, name: 'Dhanori' },
  'lohegaon': { lat: 18.5982, lng: 73.9189, name: 'Lohegaon' },
  'bibwewadi': { lat: 18.4720, lng: 73.8640, name: 'Bibwewadi' },
  'dhankawadi': { lat: 18.4630, lng: 73.8560, name: 'Dhankawadi' },
  'narhe': { lat: 18.4480, lng: 73.8210, name: 'Narhe' },
  'ambegaon': { lat: 18.4480, lng: 73.8400, name: 'Ambegaon' },
  'vadgaon sheri': { lat: 18.5500, lng: 73.9200, name: 'Vadgaon Sheri' },
  'keshav nagar': { lat: 18.5280, lng: 73.9350, name: 'Keshav Nagar' },
  'mundhwa': { lat: 18.5300, lng: 73.9250, name: 'Mundhwa' },

  // Key Regional & Intercity Freight Hubs
  'pune': { lat: 18.5204, lng: 73.8567, name: 'Pune, Maharashtra' },
  'hyderabad': { lat: 17.3850, lng: 78.4867, name: 'Hyderabad, Telangana' },
  'secunderabad': { lat: 17.4399, lng: 78.4983, name: 'Secunderabad, Telangana' },
  'mumbai': { lat: 19.0760, lng: 72.8777, name: 'Mumbai, Maharashtra' },
  'navi mumbai': { lat: 19.0330, lng: 73.0297, name: 'Navi Mumbai, Maharashtra' },
  'thane': { lat: 19.2183, lng: 72.9781, name: 'Thane, Maharashtra' },
  'bengaluru': { lat: 12.9716, lng: 77.5946, name: 'Bengaluru, Karnataka' },
  'bangalore': { lat: 12.9716, lng: 77.5946, name: 'Bangalore, Karnataka' },
  'nashik': { lat: 19.9975, lng: 73.7898, name: 'Nashik, Maharashtra' },
  'solapur': { lat: 17.6599, lng: 75.9064, name: 'Solapur, Maharashtra' },
  'kolhapur': { lat: 16.7050, lng: 74.2433, name: 'Kolhapur, Maharashtra' },
  'satara': { lat: 17.6805, lng: 73.9997, name: 'Satara, Maharashtra' },
  'sangli': { lat: 16.8524, lng: 74.5815, name: 'Sangli, Maharashtra' },
  'ahmednagar': { lat: 19.0952, lng: 74.7480, name: 'Ahmednagar, Maharashtra' },
  'aurangabad': { lat: 19.8762, lng: 75.3433, name: 'Chhatrapati Sambhajinagar' },
  'sambhajinagar': { lat: 19.8762, lng: 75.3433, name: 'Chhatrapati Sambhajinagar' },
  'nagpur': { lat: 21.1458, lng: 79.0882, name: 'Nagpur, Maharashtra' },

  // Key Educational, Residential & Prominent Pune Suburb Landmarks
  'delhi public school': { lat: 18.4727, lng: 73.9048, name: 'Delhi Public School (DPS), Nyati Estate Road, Mohammadwadi, Pune' },
  'dps pune': { lat: 18.4727, lng: 73.9048, name: 'Delhi Public School (DPS), Nyati Estate Road, Mohammadwadi, Pune' },
  'dps': { lat: 18.4727, lng: 73.9048, name: 'Delhi Public School (DPS), Nyati Estate Road, Pune' },
  'nyati estate': { lat: 18.4735, lng: 73.9055, name: 'Nyati Estate, Mohammadwadi, Pune' },
  'krushna nagar': { lat: 18.4740, lng: 73.9060, name: 'Krushna Nagar, Mohammadwadi, Pune' },
  'shiva heights': { lat: 18.5985, lng: 73.7825, name: 'Shiva Heights, Vishal Nagar, Pimpri-Chinchwad' },
  'vishal nagar': { lat: 18.5980, lng: 73.7830, name: 'Vishal Nagar, Pimpri-Chinchwad' }
};

// Intercity freight destinations outside Pune Metropolitan Area
export const INTERCITY_HUBS = {
  'hyderabad': { lat: 17.3850, lng: 78.4867, name: 'Hyderabad, Telangana' },
  'secunderabad': { lat: 17.4399, lng: 78.4983, name: 'Secunderabad, Telangana' },
  'bengaluru': { lat: 12.9716, lng: 77.5946, name: 'Bengaluru, Karnataka' },
  'bangalore': { lat: 12.9716, lng: 77.5946, name: 'Bangalore, Karnataka' },
  'goa': { lat: 15.2993, lng: 74.1240, name: 'Goa' },
  'delhi': { lat: 28.6139, lng: 77.2090, name: 'Delhi NCR' },
  'chennai': { lat: 13.0827, lng: 80.2707, name: 'Chennai, Tamil Nadu' },
  'surat': { lat: 21.1702, lng: 72.8311, name: 'Surat, Gujarat' },
  'ahmedabad': { lat: 23.0225, lng: 72.5714, name: 'Ahmedabad, Gujarat' },
  'indore': { lat: 22.7196, lng: 75.8577, name: 'Indore, Madhya Pradesh' }
};

/**
 * Match a raw address against known Pune landmarks and roads.
 * Longest keys are checked first for exact specificity.
 */
export const matchPuneKnownLocation = (rawAddress) => {
  if (!rawAddress || typeof rawAddress !== 'string') return null;
  const lower = rawAddress.toLowerCase().trim();

  // 1. Check Pune landmarks first (longest match first)
  const sortedKeys = Object.keys(KNOWN_PUNE_LOCATIONS).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (lower.includes(key)) {
      return { key, ...KNOWN_PUNE_LOCATIONS[key] };
    }
  }

  // 2. Intercity hubs should ONLY match if the address is explicitly targeting that other city,
  // NOT when it's an intra-Pune address mentioning a school, road, or shop (e.g., Delhi Public School, Indore Sweets)
  const isExplicitPuneContext = lower.includes('pune') || 
                                lower.includes('pcmc') || 
                                lower.includes('maharashtra') || 
                                lower.includes('school') || 
                                lower.includes('road') || 
                                lower.includes('estate') || 
                                lower.includes('nagar');

  if (!isExplicitPuneContext) {
    const hubKeys = Object.keys(INTERCITY_HUBS).sort((a, b) => b.length - a.length);
    for (const key of hubKeys) {
      const wordRegex = new RegExp(`\\b${key}\\b`, 'i');
      if (wordRegex.test(lower)) {
        return { key, ...INTERCITY_HUBS[key] };
      }
    }
  }

  return null;
};

/**
 * Extracts searchable address candidates by progressively stripping private residential prefixes
 * (flat numbers, wing numbers, building names, and directional clauses like "behind the back").
 */
export const extractSearchCandidates = (rawAddress) => {
  if (!rawAddress || typeof rawAddress !== 'string') return [];
  const clean = rawAddress.trim();
  const candidates = [clean];

  // Strip flat/room/unit/plot/building prefix:
  const strippedPrefix = clean.replace(
    /^(\d+[-/A-Za-z0-9]*\s*(flat|flt|room|rm|plot|bldg|building|bungalow|apt|apartment|society|soc|wing\s*[A-Za-z])?[\s,]+)+/i,
    ''
  ).trim();
  if (strippedPrefix && strippedPrefix !== clean && strippedPrefix.length > 3) {
    candidates.push(strippedPrefix);
  }

  // Strip directional connector words
  const strippedDirections = clean.replace(
    /\b(behind\s+the\s+back|behind|near|opp\b|opposite|adj\b|adjacent\s+to|in\s+front\s+of|beside|next\s+to|at|post)\b/gi,
    ','
  );

  // Extract segments split by commas
  const segments = strippedDirections
    .split(/[,;\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 2);

  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    if (seg && !candidates.includes(seg)) {
      candidates.push(seg);
    }
  }

  return candidates;
};

// Global memory cache for geocoded queries
const geocodeCache = new Map();

/**
 * Geocode an address query to { lat, lng } within Pune Metropolitan Area
 */
export const geocodeAddress = async (query) => {
  if (!query || typeof query !== 'string' || query.trim().length < 2) return null;
  const clean = query.trim();

  if (geocodeCache.has(clean)) {
    return geocodeCache.get(clean);
  }

  // 1. Direct landmark & road dictionary check
  const directMatch = matchPuneKnownLocation(clean);
  if (directMatch) {
    const coords = { lat: directMatch.lat, lng: directMatch.lng };
    geocodeCache.set(clean, coords);
    return coords;
  }

  // 2. Candidate decomposition: extract road/landmark candidates from complex home addresses
  const candidates = extractSearchCandidates(clean);
  for (const cand of candidates) {
    const candMatch = matchPuneKnownLocation(cand);
    if (candMatch) {
      const coords = { lat: candMatch.lat, lng: candMatch.lng };
      geocodeCache.set(clean, coords);
      return coords;
    }
  }

  // 3. Live Nominatim geocoding bounded strictly to Pune & PCMC Metropolitan Region (PMRDA)
  try {
    for (const cand of candidates.slice(0, 3)) {
      let searchParam = cand;
      const lowerCand = cand.toLowerCase();
      if (!lowerCand.includes('pune') && !lowerCand.includes('pcmc') && !lowerCand.includes('maharashtra')) {
        searchParam = `${cand}, Pune, Maharashtra`;
      }
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchParam)}&viewbox=73.60,18.85,74.20,18.30&bounded=1&countrycodes=in&limit=1`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'Eminence-Transport-MVP/1.0'
        }
      });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        if (lat >= 8.0 && lat <= 36.5 && lng >= 68.0 && lng <= 97.5) {
          const coords = { lat, lng };
          geocodeCache.set(clean, coords);
          return coords;
        }
      }
    }
  } catch (err) {
    console.warn('Live geocoding network notice:', err);
  }

  // 4. Fallback deterministic offset within Pune boundary
  const hash = clean.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const fallback = {
    lat: 18.5204 + ((hash % 80) - 40) * 0.0015,
    lng: 73.8567 + (((hash * 5) % 80) - 40) * 0.0015
  };
  geocodeCache.set(clean, fallback);
  return fallback;
};

/**
 * Calculates Haversine distance in km between an array of points, factoring in a 1.35x urban road winding coefficient.
 */
export const calculateHaversineKm = (coords) => {
  if (!coords || coords.length < 2) return 0;
  let totalCrowFlies = 0;
  const R = 6371; // Earth's radius in km

  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i];
    const p2 = coords[i + 1];
    if (!p1 || !p2 || typeof p1.lat !== 'number' || typeof p2.lat !== 'number') continue;
    
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    totalCrowFlies += R * c;
  }

  return parseFloat(Math.max(1.0, totalCrowFlies * 1.35).toFixed(1));
};

/**
 * Fetch real turn-by-turn road route via OSRM, with automatic Haversine fallback
 */
export const fetchOsrmRoute = async (points) => {
  if (!points || points.length < 2) {
    return { distanceKm: 0, durationMins: 0, polyline: [] };
  }

  const validPoints = points.filter(p => p && typeof p.lat === 'number' && typeof p.lng === 'number');
  if (validPoints.length < 2) {
    return { distanceKm: 0, durationMins: 0, polyline: [] };
  }

  try {
    const coordString = validPoints.map(p => `${p.lng},${p.lat}`).join(';');
    const osrmBaseUrl = (import.meta.env.VITE_OSRM_BASE_URL || 'https://router.project-osrm.org').replace(/\/$/, '');
    const url = `${osrmBaseUrl}/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    const data = await res.json();

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const primaryRoute = data.routes[0];
      const latLngs = primaryRoute.geometry.coordinates.map(coord => [coord[1], coord[0]]);
      const distanceKm = parseFloat((primaryRoute.distance / 1000).toFixed(1));
      const durationMins = Math.max(1, Math.round(primaryRoute.duration / 60));

      return {
        distanceKm,
        durationMins,
        polyline: latLngs,
        isFallback: false
      };
    }
  } catch (err) {
    console.warn('OSRM routing notice, using road geometry fallback:', err?.message || err);
  }

  // Robust Fallback
  const fallbackDistance = calculateHaversineKm(validPoints);
  const fallbackDuration = Math.max(3, Math.round(fallbackDistance * 2.5));
  const fallbackPolyline = validPoints.map(p => [p.lat, p.lng]);

  return {
    distanceKm: fallbackDistance,
    durationMins: fallbackDuration,
    polyline: fallbackPolyline,
    isFallback: true
  };
};

/**
 * Standard PIN code mapping for major Pune & PCMC localities, corridors and suburbs.
 */
export const PUNE_LOCALITY_PINCODES = {
  // Kothrud & Paud Road
  'kothrud depot': '411038',
  'kothrud': '411038',
  'paud road': '411038',
  'vanaz': '411038',
  'gujarat colony': '411038',
  'ideal colony': '411038',
  'mayur colony': '411038',
  'dahanukar colony': '411038',
  'paramhans nagar': '411038',
  'chandani chowk': '411038',
  'kinara': '411038',

  // Hinjewadi & Wakad
  'hinjewadi phase 1': '411057',
  'hinjewadi phase 2': '411057',
  'hinjewadi phase 3': '411057',
  'hinjewadi': '411057',
  'hinjawadi': '411057',
  'wakad': '411057',
  'bhumkar chowk': '411057',
  'datta mandir': '411057',
  'kaspate vasti': '411057',

  // Baner & Balewadi
  'balewadi high street': '411045',
  'balewadi stadium': '411045',
  'balewadi': '411045',
  'baner road': '411045',
  'baner': '411045',
  'pancard club': '411045',
  'mahalunge': '411045',

  // Aundh & University
  'dp road': '411007',
  'aundh': '411007',
  'sindh society': '411007',
  'parihar chowk': '411007',
  'medipoint': '411007',
  'anand park': '411007',
  'ganeshkhind': '411007',
  'pune university': '411007',
  'sppu': '411007',

  // Pashan & Bavdhan
  'bavdhan khurd': '411021',
  'bavdhan budruk': '411021',
  'bavdhan': '411021',
  'pashan': '411021',
  'sus road': '411021',
  'sus': '411021',

  // Karve Nagar & Warje
  'karve nagar': '411052',
  'cummins college': '411052',
  'hingne': '411052',
  'warje malwadi': '411058',
  'warje': '411058',
  'popular nagar': '411058',
  'mai mangeshkar': '411058',
  'atul nagar': '411058',

  // Deccan & Erandwane
  'deccan gymkhana': '411004',
  'deccan': '411004',
  'erandwane': '411004',
  'prabhat road': '411004',
  'law college road': '411004',
  'law college': '411004',
  'bhandarkar road': '411004',
  'bhandarkar': '411004',
  'bmcc': '411004',
  'brihan maharashtra': '411004',
  'karve road': '411004',

  // Shivajinagar & Central
  'shivajinagar station': '411005',
  'shivajinagar': '411005',
  'jm road': '411005',
  'jangali maharaj': '411005',
  'fc road': '411004',
  'fergusson': '411004',
  'coep': '411005',
  'wakdewadi': '411005',
  'senapati bapat': '411016',
  'sb road': '411016',
  'model colony': '411016',
  'gokhale nagar': '411016',

  // Pune Camp & Station
  'pune railway station': '411001',
  'pune railway': '411001',
  'pune station': '411001',
  'bund garden': '411001',
  'boat club': '411001',
  'mg road': '411001',
  'east street': '411001',
  'camp': '411001',
  'ghorpuri': '411001',
  'ghorpadi': '411001',
  'sassoon': '411001',
  'koregaon park': '411001',

  // Old City (Peths)
  'shaniwar wada': '411030',
  'shaniwar peth': '411030',
  'sadashiv peth': '411030',
  'narayan peth': '411030',
  'tilak road': '411030',
  'kumthekar road': '411030',
  'kumthekar': '411030',
  'sp college': '411030',
  'perugate': '411030',
  'budhwar peth': '411002',
  'shukrawar peth': '411002',
  'laxmi road': '411002',
  'dagdusheth': '411002',
  'mandai': '411002',
  'tulshibaug': '411002',
  'bajirao road': '411002',
  'kasba peth': '411011',
  'rasta peth': '411011',
  'somwar peth': '411011',
  'mangalwar peth': '411011',
  'guruwar peth': '411042',
  'swargate bus': '411042',
  'swargate': '411042',
  'parvati': '411009',
  'mitra mandal': '411009',
  'sarasbaug': '411009',
  'gultekdi': '411037',
  'market yard': '411037',

  // Kalyani Nagar & Yerawada
  'kalyani nagar': '411006',
  'yerawada': '411006',
  'yerwada': '411006',
  'shastri nagar': '411006',
  'golf course': '411006',

  // Viman Nagar & Airport & Kharadi
  'pune international airport': '411032',
  'pune airport': '411032',
  'lohegaon airport': '411032',
  'tingre nagar': '411015',
  'vishrantwadi': '411015',
  'dhanori': '411015',
  'lohegaon': '411047',
  'porwal road': '411047',
  'viman nagar': '411014',
  'kharadi': '411014',
  'eon it park': '411014',
  'eon': '411014',
  'world trade center': '411014',
  'wtc': '411014',
  'vadgaon sheri': '411014',
  'chandan nagar': '411014',

  // Wagholi
  'bjs school': '412207',
  'bjs college': '412207',
  'bjs': '412207',
  'bakori road': '412207',
  'bakori': '412207',
  'wagholi': '412207',
  'kesnand': '412207',
  'ivy estate': '412207',
  'ubale nagar': '412207',

  // Hadapsar & Magarpatta & Mundhwa
  'magarpatta city': '411028',
  'magarpatta': '411028',
  'amanora': '411028',
  'hadapsar': '411028',
  'gadital': '411028',
  'noble hospital': '411028',
  'sasane nagar': '411028',
  'mundhwa': '411036',
  'keshav nagar': '411036',
  'pingale vasti': '411036',
  'manjri': '412307',
  'manjari': '412307',
  'phursungi': '412308',
  'sp infocity': '412308',
  'fursungi': '412308',

  // Wanowrie & Kondhwa & Mohammadwadi
  'wanowrie': '411040',
  'wanwadi': '411040',
  'fatima nagar': '411040',
  'salunke vihar': '411040',
  'kedari nagar': '411040',
  'lulla nagar': '411040',
  'delhi public school': '411048',
  'dps pune': '411048',
  'dps': '411048',
  'nyati estate': '411048',
  'krushna nagar': '411048',
  'mohammadwadi': '411048',
  'kondhwa': '411048',
  'nibm road': '411048',
  'nibm': '411048',
  'undri': '411060',
  'pisoli': '411060',
  'yeolewadi': '411048',
  'yewalewadi': '411048',

  // Katraj & Dhankawadi & Bibwewadi & Sinhagad Road
  'katraj': '411046',
  'bharati vidyapeeth': '411046',
  'wonder city': '411046',
  'dhankawadi': '411043',
  'balaji nagar': '411043',
  'padmavati': '411043',
  'bibwewadi': '411037',
  'salisbury park': '411037',
  'gangadham': '411037',
  'narhe': '411041',
  'ambegaon': '411046',
  'sinhagad road': '411041',
  'vadgaon budruk': '411041',
  'anand nagar': '411041',
  'manik baug': '411041',
  'dhayari': '411041',
  'nanded city': '411041',
  'abhiruchi': '411041',

  // PCMC Localities
  'pimple saudagar': '411027',
  'pimple gurav': '411027',
  'pimple nilakh': '411027',
  'vishal nagar': '411027',
  'shiva heights': '411027',
  'kunal icon': '411027',
  'rahatani': '411017',
  'sangvi': '411027',
  'new sangvi': '411027',
  'old sangvi': '411027',
  'chinchwad station': '411033',
  'chinchwad gaon': '411033',
  'chinchwad': '411033',
  'thergaon': '411033',
  'dange chowk': '411033',
  'kalewadi': '411017',
  'tathawade': '411033',
  'punawale': '411033',
  'pimpri': '411018',
  'nehrunagar': '411018',
  'morwadi': '411018',
  'bhosari': '411026',
  'landewadi': '411026',
  'indrayani nagar': '411026',
  'nigdi': '411044',
  'pradhikaran': '411044',
  'yamuna nagar': '411044',
  'akurdi': '411035',
  'ravet': '412101',
  'kiwale': '412101',
  'dehu road': '412101',
  'chakan': '410501',
  'talegaon': '410507',
  'alandi': '412105'
};

/**
 * Intelligent helper to extract/auto-resolve a 6-digit Pune PIN code from:
 * 1) Nominatim address details object (postcode)
 * 2) Explicit 6-digit PIN code in text (e.g. 411038)
 * 3) Pune/PCMC locality & landmark dictionary lookup
 *
 * @param {string} addressOrLocality - The raw address or query string
 * @param {object} [rawObj] - Optional raw geocoder / Nominatim result object
 * @returns {string} 6-digit postal code if resolved, else empty string
 */
export const getPunePincode = (addressOrLocality, rawObj = null) => {
  // 1. Check rawObj Nominatim address postcode if valid 6-digit PIN
  const rawPostcode = rawObj?.postalCode ||
                      rawObj?.postcode ||
                      rawObj?.address?.postcode || 
                      rawObj?.raw?.address?.postcode;
  if (rawPostcode) {
    const cleaned = String(rawPostcode).replace(/\D/g, '').slice(0, 6);
    if (cleaned.length === 6 && (cleaned.startsWith('41') || cleaned.startsWith('40') || cleaned.startsWith('42'))) {
      return cleaned;
    }
  }

  // 2. Check if a 6-digit PIN code is directly in the address text
  const combinedText = [
    typeof addressOrLocality === 'string' ? addressOrLocality : '',
    rawObj?.display_name || '',
    rawObj?.name || '',
    rawObj?.custom_address || '',
    rawObj?.raw?.display_name || ''
  ].filter(Boolean).join(' ');

  const pinRegexMatch = combinedText.match(/\b(41\d{4}|412\d{3}|410\d{3}|40\d{4})\b/);
  if (pinRegexMatch) {
    return pinRegexMatch[1];
  }

  // 3. Match against known Pune / PCMC locality pincodes
  const lower = combinedText.toLowerCase();
  
  const matches = [];
  const sortedKeys = Object.keys(PUNE_LOCALITY_PINCODES).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    const idx = lower.indexOf(key);
    if (idx !== -1) {
      matches.push({ key, index: idx, length: key.length, pincode: PUNE_LOCALITY_PINCODES[key] });
    }
  }

  if (matches.length > 0) {
    // Prioritize earlier occurrence in address (e.g. specific locality at start),
    // and if close/same position, longer key match (e.g. 'kothrud depot' over 'kothrud')
    matches.sort((a, b) => {
      if (Math.abs(a.index - b.index) > 5) {
        return a.index - b.index;
      }
      return b.length - a.length;
    });
    return matches[0].pincode;
  }

  // 4. Check KNOWN_PUNE_LOCATIONS
  const locMatch = matchPuneKnownLocation(lower);
  if (locMatch?.postalCode) {
    return locMatch.postalCode;
  }

  return '';
};

