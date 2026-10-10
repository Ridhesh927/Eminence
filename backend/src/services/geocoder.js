const axios = require('axios');

/**
 * Geocode an address using OpenStreetMap's Nominatim API.
 * @param {string} address - The text address to geocode.
 * @returns {Promise<{lat: number, lng: number, label: string} | null>}
 */
const geocodeAddress = async (address) => {
  if (!address || typeof address !== 'string' || address.trim().length === 0) {
    return null;
  }

  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: address,
        format: 'json',
        limit: 1,
        addressdetails: 1,
      },
      headers: {
        'User-Agent': 'Eminence-Transport-MVP/1.0',
      },
      timeout: 5000,
    });

    if (response.data && response.data.length > 0) {
      const match = response.data[0];
      return {
        lat: parseFloat(match.lat),
        lng: parseFloat(match.lon),
        label: match.display_name,
      };
    }
    return null;
  } catch (error) {
    console.error('[Geocoder] Failed to geocode address: %s %s', address, error.message);
    return null; // Fallback to null on failure
  }
};

module.exports = {
  geocodeAddress,
};
