const axios = require('axios');
const {
  calculateDistance,
  getRouteDistance,
  optimizeRoute
} = require('../../src/services/routeOptimizer');

jest.mock('axios', () => ({
  get: jest.fn()
}));

describe('route optimizer', () => {
  beforeEach(() => {
    axios.get.mockReset();
  });

  it('calculates zero distance for identical points', () => {
    expect(calculateDistance({ lat: 18.52, lng: 73.85 }, { lat: 18.52, lng: 73.85 })).toBe(0);
  });

  it('rejects invalid coordinates even for a single waypoint', async () => {
    await expect(optimizeRoute(
      { lat: 18.52, lng: 73.85 },
      [{ id: 'drop-1', lat: 200, lng: 73.86 }]
    )).rejects.toThrow('missing or invalid geocoded coordinates');
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('uses nearest-neighbor fallback with deterministic ETA when OSRM fails', async () => {
    axios.get.mockRejectedValue(new Error('OSRM unavailable'));
    const result = await optimizeRoute(
      { lat: 18.52, lng: 73.85 },
      [
        { id: 'far', lat: 18.55, lng: 73.88 },
        { id: 'near', lat: 18.521, lng: 73.851 }
      ]
    );

    expect(result.map(point => point.id)).toEqual(['near', 'far']);
    expect(result.every(point => point.isFallback)).toBe(true);
    expect(result.every(point => point.legDistance > 0)).toBe(true);
    expect(result.every(point => point.duration > 0)).toBe(true);
  });

  it('maps realistic OSRM trip waypoints by their input order', async () => {
    axios.get.mockResolvedValue({
      data: {
        code: 'Ok',
        waypoints: [
          { waypoint_index: 0 },
          { waypoint_index: 2 },
          { waypoint_index: 1 }
        ],
        trips: [{
          legs: [
            { distance: 2400, duration: 300 },
            { distance: 5100, duration: 600 }
          ]
        }]
      }
    });

    const result = await optimizeRoute(
      { lat: 18.52, lng: 73.85 },
      [
        { id: 'drop-a', lat: 18.53, lng: 73.86 },
        { id: 'drop-b', lat: 18.54, lng: 73.87 }
      ]
    );

    expect(result.map(point => point.id)).toEqual(['drop-b', 'drop-a']);
    expect(result.map(point => point.legDistance)).toEqual([2.4, 5.1]);
    expect(result.map(point => point.duration)).toEqual([300, 600]);
    expect(result.some(point => point.isFallback)).toBe(false);
  });

  it('uses OSRM distance when the provider returns a valid route', async () => {
    axios.get.mockResolvedValue({
      data: { code: 'Ok', routes: [{ distance: 12345 }] }
    });

    await expect(getRouteDistance(
      { lat: 18.52, lng: 73.85 },
      { lat: 18.54, lng: 73.87 }
    )).resolves.toBe(12.3);
  });

  it('uses a bounded urban fallback distance when OSRM is unavailable', async () => {
    axios.get.mockRejectedValue(new Error('OSRM unavailable'));

    const result = await getRouteDistance(
      { lat: 18.52, lng: 73.85 },
      { lat: 18.54, lng: 73.87 }
    );

    expect(result).toBeGreaterThan(0);
    expect(result).toBeCloseTo(calculateDistance(
      { lat: 18.52, lng: 73.85 },
      { lat: 18.54, lng: 73.87 }
    ) * 1.32, 1);
  });
});
