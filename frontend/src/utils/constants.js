// Core Project Constraints
export const PROJECT_SCOPE = {
  CITY: 'Pune',
  STATE: 'Maharashtra',
  COUNTRY: 'India',
};

// Google Maps Configuration (Pune only)
export const MAP_CONFIG = {
  // Center of Pune
  DEFAULT_CENTER: {
    lat: 18.5204,
    lng: 73.8567,
  },
  DEFAULT_ZOOM: 12,
  
  // Geographical bounds to restrict search/autocomplete to Pune roughly
  PUNE_BOUNDS: {
    north: 18.730, // Rough northern bound (PCMC area)
    south: 18.350, // Rough southern bound (Katraj area)
    east: 74.050,  // Rough eastern bound (Wagholi/Hadapsar)
    west: 73.650,  // Rough western bound (Hinjawadi/Bavdhan)
  }
};
