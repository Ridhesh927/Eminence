/**
 * In-Memory LRU Cache Service (Redis Simulation)
 * Acts as a drop-in mock for Redis to cache driver availability,
 * pricing tiers, and other frequently-read data.
 */

const DEFAULT_TTL_MS = 60 * 1000; // 1 minute default TTL
const MAX_CACHE_SIZE = 100;

const cache = new Map();

/**
 * Set a value in the cache with an optional TTL (in ms).
 */
const set = (key, value, ttl = DEFAULT_TTL_MS) => {
  if (cache.size >= MAX_CACHE_SIZE) {
    // Evict the oldest entry (LRU approximation)
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttl
  });
};

/**
 * Get a value from the cache. Returns null if missing or expired.
 */
const get = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
};

/**
 * Delete a key from the cache.
 */
const del = (key) => {
  cache.delete(key);
};

/**
 * Clear the entire cache.
 */
const flush = () => {
  cache.clear();
};

/**
 * Get cache stats (for SLA monitoring).
 */
const stats = () => ({
  size: cache.size,
  maxSize: MAX_CACHE_SIZE
});

module.exports = { set, get, del, flush, stats };
