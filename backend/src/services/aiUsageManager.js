/**
 * aiUsageManager.js
 * 
 * Centralized AI Usage, Quota, Concurrency, and Rate Limit Protection.
 * Controls access to external LLM providers (Groq) with atomic quotas,
 * concurrency bounds, per-user sliding window limits, daily spend caps,
 * request timeouts, and safe operational telemetry.
 */

// In-memory atomic counters (survives requests, process-scoped)
let currentConcurrentRequests = 0;
let dailyRequestsCount = 0;
let lastResetDateUtc = new Date().toISOString().split('T')[0];

const getPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const getSupportContact = () => process.env.SUPPORT_PHONE
  ? `call ${process.env.SUPPORT_PHONE}`
  : 'use the in-app support channel';

// Sliding window per-user request timestamps: Map<userIdOrIp, Array<number>>
const userRequestTimestamps = new Map();

// Periodic cleanup of stale user timestamp buckets every 5 minutes to prevent memory leaks
setInterval(() => {
  const cutoff = Date.now() - 5 * 60 * 1000;
  for (const [key, timestamps] of userRequestTimestamps.entries()) {
    const recent = timestamps.filter(t => t > cutoff);
    if (recent.length === 0) {
      userRequestTimestamps.delete(key);
    } else {
      userRequestTimestamps.set(key, recent);
    }
  }
}, 5 * 60 * 1000).unref();

/**
 * Reset daily quota at 00:00 UTC
 */
function checkDayReset() {
  const todayUtc = new Date().toISOString().split('T')[0];
  if (todayUtc !== lastResetDateUtc) {
    dailyRequestsCount = 0;
    lastResetDateUtc = todayUtc;
  }
}

/**
 * Attempt to acquire an atomic execution slot for an AI request.
 * Enforces:
 * 1. Global AI Feature Kill Switch (AI_FEATURE_ENABLED)
 * 2. Daily Global Request Quota (AI_DAILY_QUOTA_LIMIT)
 * 3. Server-wide Concurrency Limit (AI_MAX_CONCURRENT_REQUESTS)
 * 4. Per-User / Per-IP Sliding Window Rate Limit (AI_USER_RATE_LIMIT_PER_MINUTE)
 * 
 * @param {string} userIdOrIp - Verified user ID or client IP
 * @returns {{ allowed: boolean, reason?: string, message?: string, release?: (meta: any) => void }}
 */
function tryAcquireAiSlot(userIdOrIp) {
  // 1. Configurable Kill Switch
  const isEnabled = process.env.AI_FEATURE_ENABLED !== 'false';
  if (!isEnabled) {
    return {
      allowed: false,
      reason: 'AI_DISABLED',
      message: `AI assistance is temporarily disabled for scheduled maintenance. Please use manual booking or ${getSupportContact()}.`
    };
  }

  checkDayReset();

  // 2. Global Daily Quota Protection
  const dailyQuotaLimit = getPositiveInt(process.env.AI_DAILY_QUOTA_LIMIT, 500);
  if (dailyRequestsCount >= dailyQuotaLimit) {
    return {
      allowed: false,
      reason: 'DAILY_QUOTA_EXCEEDED',
      message: `Daily AI usage quota has been reached. Please try again tomorrow or ${getSupportContact()}.`
    };
  }

  // 3. Global Concurrency Cap
  const maxConcurrent = getPositiveInt(process.env.AI_MAX_CONCURRENT_REQUESTS, 5);
  if (currentConcurrentRequests >= maxConcurrent) {
    return {
      allowed: false,
      reason: 'CONCURRENCY_LIMIT',
      message: 'AI assistant is currently experiencing high load. Please retry in a few seconds.'
    };
  }

  // 4. Per-User Sliding Window Rate Limit
  const userRateLimit = getPositiveInt(process.env.AI_USER_RATE_LIMIT_PER_MINUTE, 10);
  const now = Date.now();
  const rawTimestamps = userRequestTimestamps.get(userIdOrIp) || [];
  const recentTimestamps = rawTimestamps.filter(t => now - t < 60000);

  if (recentTimestamps.length >= userRateLimit) {
    return {
      allowed: false,
      reason: 'USER_RATE_LIMITED',
      message: 'You have submitted too many AI requests. Please wait a moment before trying again.'
    };
  }

  // Atomically reserve slot
  currentConcurrentRequests++;
  dailyRequestsCount++;
  recentTimestamps.push(now);
  userRequestTimestamps.set(userIdOrIp, recentTimestamps);

  let released = false;
  const release = (metadata = {}) => {
    if (released) return;
    released = true;
    currentConcurrentRequests = Math.max(0, currentConcurrentRequests - 1);

    // Safe operational telemetry (never logs API keys, auth headers, prompts, or PII)
    if (process.env.NODE_ENV !== 'test') {
      const outcome = metadata.outcome || 'success';
      const duration = metadata.durationMs || 0;
      const model = metadata.model || 'groq';
      const inputChars = Number.isInteger(metadata.inputChars) ? metadata.inputChars : 0;
      const outputTokens = Number.isInteger(metadata.outputTokens) ? metadata.outputTokens : 0;
      console.log(`[AI Telemetry] outcome=${outcome} durationMs=${duration} model=${model} inputChars=${inputChars} outputTokens=${outputTokens}`);
    }
  };

  return {
    allowed: true,
    release
  };
}

/**
 * Execute an external AI operation with strict timeout and bounded retry policy.
 * @param {Function} taskFn - Async function executing the Groq API call
 * @param {Object} options
 * @param {number} [options.timeoutMs=8000] - Request timeout
 * @param {string} [options.model='groq']
 * @returns {Promise<any>}
 */
async function executeWithBoundedTimeout(taskFn, options = {}) {
  const timeoutMs = options.timeoutMs || getPositiveInt(process.env.AI_REQUEST_TIMEOUT_MS, 8000);

  let timeoutHandle;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      const err = new Error(`AI request timed out after ${timeoutMs}ms`);
      err.code = 'AI_TIMEOUT';
      reject(err);
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([taskFn(), timeoutPromise]);
    clearTimeout(timeoutHandle);
    return result;
  } catch (error) {
    clearTimeout(timeoutHandle);
    throw error;
  }
}

/**
 * Returns safe operational metrics for rate-limit and cost monitoring.
 */
function getAiUsageMetrics() {
  checkDayReset();
  return {
    isEnabled: process.env.AI_FEATURE_ENABLED !== 'false',
    dailyRequestsCount,
    dailyQuotaLimit: getPositiveInt(process.env.AI_DAILY_QUOTA_LIMIT, 500),
    currentConcurrentRequests,
    maxConcurrentRequests: getPositiveInt(process.env.AI_MAX_CONCURRENT_REQUESTS, 5),
    userRateLimitPerMinute: getPositiveInt(process.env.AI_USER_RATE_LIMIT_PER_MINUTE, 10),
    trackedUsersCount: userRequestTimestamps.size
  };
}

/**
 * Resets counters (intended for test environments).
 */
function resetAiUsageForTesting() {
  currentConcurrentRequests = 0;
  dailyRequestsCount = 0;
  userRequestTimestamps.clear();
}

module.exports = {
  tryAcquireAiSlot,
  executeWithBoundedTimeout,
  getAiUsageMetrics,
  resetAiUsageForTesting
};
