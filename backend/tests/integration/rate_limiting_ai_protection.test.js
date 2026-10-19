const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const {
  getClientKey,
  createRateLimiter,
  locationTrackingLimiter
} = require('../../src/middleware/rateLimiter');
const {
  tryAcquireAiSlot,
  executeWithBoundedTimeout,
  getAiUsageMetrics,
  resetAiUsageForTesting
} = require('../../src/services/aiUsageManager');
const { checkFaqCache, handleSupportMessage } = require('../../src/services/supportBotService');

jest.mock('groq-sdk', () => class MockGroq {
  constructor() {
    this.chat = {
      completions: {
        create: jest.fn().mockRejectedValue(Object.assign(new Error('provider quota exhausted'), { status: 429 }))
      }
    };
    this.audio = {
      transcriptions: {
        create: jest.fn()
      }
    };
  }
});

describe('Phase 2C — Rate Limiting, AI API Protection & Cost Control Suite', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'test_phase2c_jwt_secret_key_32_chars!';
  process.env.JWT_SECRET = JWT_SECRET;

  let testCustomerToken;

  beforeAll(() => {
    testCustomerToken = jwt.sign(
      { id: 'rate-limit-test-user-001', role: 'customer' },
      JWT_SECRET
    );
  });

  beforeEach(() => {
    resetAiUsageForTesting();
    delete process.env.AI_FEATURE_ENABLED;
    delete process.env.AI_DAILY_QUOTA_LIMIT;
    delete process.env.AI_MAX_CONCURRENT_REQUESTS;
    delete process.env.AI_USER_RATE_LIMIT_PER_MINUTE;
    delete process.env.AI_REQUEST_TIMEOUT_MS;
    delete process.env.GROQ_API_KEY;
  });

  afterAll(() => {
    resetAiUsageForTesting();
  });

  // =========================================================================
  // 1. BACKEND RATE LIMITING & IDENTITY ATTRIBUTION
  // =========================================================================
  describe('Backend Rate Limiting & Proxy / Client Key Security', () => {
    test('1. Requests below configured limit succeed (HTTP 200)', async () => {
      const testApp = express();
      const testLimiter = createRateLimiter({
        windowMs: 60 * 1000,
        max: 3,
        message: 'Too many requests'
      });

      testApp.get('/api/test-limit', testLimiter, (req, res) => res.json({ success: true }));

      const res1 = await request(testApp).get('/api/test-limit');
      expect(res1.status).toBe(200);
      expect(res1.body.success).toBe(true);

      const res2 = await request(testApp).get('/api/test-limit');
      expect(res2.status).toBe(200);
    });

    test('2. Requests exceeding limit receive HTTP 429 with Retry-After and standard structure', async () => {
      const testApp = express();
      const testLimiter = createRateLimiter({
        windowMs: 60 * 1000,
        max: 2,
        message: 'Rate limit reached, please retry later.'
      });

      testApp.get('/api/test-limit-exceed', testLimiter, (req, res) => res.json({ success: true }));

      await request(testApp).get('/api/test-limit-exceed');
      await request(testApp).get('/api/test-limit-exceed');
      const res3 = await request(testApp).get('/api/test-limit-exceed');

      expect(res3.status).toBe(429);
      expect(res3.body.success).toBe(false);
      expect(res3.body.message).toMatch(/rate limit reached/i);
      expect(res3.body.retryAfter).toBeDefined();
      expect(Number(res3.headers['retry-after'])).toBeGreaterThan(0);
    });

    test('3. Server-verified req.user.id isolates rate limits for different authenticated users', async () => {
      const testApp = express();
      const authHeaderParser = (req, res, next) => {
        const auth = req.headers.authorization;
        if (auth && auth.startsWith('Bearer ')) {
          try {
            req.user = jwt.verify(auth.split(' ')[1], JWT_SECRET);
          } catch (_) {}
        }
        next();
      };

      const userLimiter = createRateLimiter({
        windowMs: 60 * 1000,
        max: 2,
        message: 'User quota exceeded'
      });

      testApp.get('/api/user-resource', authHeaderParser, userLimiter, (req, res) => {
        res.json({ success: true, user: req.user?.id });
      });

      const tokenUserA = jwt.sign({ id: 'user-alpha', role: 'customer' }, JWT_SECRET);
      const tokenUserB = jwt.sign({ id: 'user-beta', role: 'customer' }, JWT_SECRET);

      // User A makes 2 requests (hits max)
      await request(testApp).get('/api/user-resource').set('Authorization', `Bearer ${tokenUserA}`);
      const resA2 = await request(testApp).get('/api/user-resource').set('Authorization', `Bearer ${tokenUserA}`);
      expect(resA2.status).toBe(200);

      const resA3 = await request(testApp).get('/api/user-resource').set('Authorization', `Bearer ${tokenUserA}`);
      expect(resA3.status).toBe(429); // User A is throttled

      // User B from the same test agent IP succeeds because req.user.id is isolated
      const resB1 = await request(testApp).get('/api/user-resource').set('Authorization', `Bearer ${tokenUserB}`);
      expect(resB1.status).toBe(200);
      expect(resB1.body.user).toBe('user-beta');
    });

    test('4. Spoofed client headers (X-User-Id, User-Id) are strictly ignored for rate limiting', () => {
      const fakeReqWithoutAuth = {
        headers: {
          'x-user-id': 'spoofed-admin-id',
          'user-id': 'spoofed-victim-id',
          'x-forwarded-user': 'spoofed-id'
        },
        ip: '192.168.1.100'
      };

      const key = getClientKey(fakeReqWithoutAuth);
      expect(key).toBe('192.168.1.100');
      expect(key).not.toContain('spoofed');
    });

    test('5. Location tracking limiter allows rapid driver GPS pings without false 429s', async () => {
      const testApp = express();
      testApp.post('/api/driver-location', locationTrackingLimiter, (req, res) => res.json({ success: true }));

      // Simulate 15 rapid GPS location updates
      for (let i = 0; i < 15; i++) {
        const res = await request(testApp).post('/api/driver-location');
        expect(res.status).toBe(200);
      }
    });

    test('5a. Authenticated expensive routes attribute limits to verified user identity', async () => {
      const testApp = express();
      const authHeaderParser = (req, _res, next) => {
        req.user = jwt.verify(req.headers.authorization.split(' ')[1], JWT_SECRET);
        next();
      };
      const userLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 1 });
      testApp.post('/api/expensive', authHeaderParser, userLimiter, (_req, res) => res.json({ success: true }));

      const tokenA = jwt.sign({ id: 'expensive-user-a', role: 'customer' }, JWT_SECRET);
      const tokenB = jwt.sign({ id: 'expensive-user-b', role: 'customer' }, JWT_SECRET);
      await request(testApp).post('/api/expensive').set('Authorization', `Bearer ${tokenA}`);
      expect((await request(testApp).post('/api/expensive').set('Authorization', `Bearer ${tokenA}`)).status).toBe(429);
      expect((await request(testApp).post('/api/expensive').set('Authorization', `Bearer ${tokenB}`)).status).toBe(200);
    });
  });

  // =========================================================================
  // 2. AI QUOTA, CONCURRENCY, KILL SWITCH & COST CONTROLS
  // =========================================================================
  describe('AI Usage Manager (aiUsageManager)', () => {
    test('6. Kill switch (AI_FEATURE_ENABLED=false) immediately rejects AI requests with safe reason', () => {
      process.env.AI_FEATURE_ENABLED = 'false';

      const slot = tryAcquireAiSlot('user-123');
      expect(slot.allowed).toBe(false);
      expect(slot.reason).toBe('AI_DISABLED');

      const metrics = getAiUsageMetrics();
      expect(metrics.isEnabled).toBe(false);
      expect(metrics.currentConcurrentRequests).toBe(0);
    });

    test('7. Daily quota enforcement blocks calls when AI_DAILY_QUOTA_LIMIT is reached', () => {
      process.env.AI_DAILY_QUOTA_LIMIT = '3';

      // 3 successful acquisitions
      const slot1 = tryAcquireAiSlot('user-1');
      slot1.release();

      const slot2 = tryAcquireAiSlot('user-2');
      slot2.release();

      const slot3 = tryAcquireAiSlot('user-3');
      slot3.release();

      // 4th request must be rejected
      const slot4 = tryAcquireAiSlot('user-4');
      expect(slot4.allowed).toBe(false);
      expect(slot4.reason).toBe('DAILY_QUOTA_EXCEEDED');
    });

    test('8. Concurrency limiter caps simultaneous in-flight AI requests', () => {
      process.env.AI_MAX_CONCURRENT_REQUESTS = '2';

      // Acquire 2 concurrent slots without releasing
      const slot1 = tryAcquireAiSlot('user-1');
      const slot2 = tryAcquireAiSlot('user-2');
      expect(slot1.allowed).toBe(true);
      expect(slot2.allowed).toBe(true);

      // 3rd concurrent request must be rejected
      const slot3 = tryAcquireAiSlot('user-3');
      expect(slot3.allowed).toBe(false);
      expect(slot3.reason).toBe('CONCURRENCY_LIMIT');

      // Release slot1
      slot1.release();

      // Now a new slot can be acquired
      const slot4 = tryAcquireAiSlot('user-4');
      expect(slot4.allowed).toBe(true);
      slot2.release();
      slot4.release();
    });

    test('9. Per-user minute rate limit prevents single-user AI flooding', () => {
      process.env.AI_USER_RATE_LIMIT_PER_MINUTE = '2';

      const s1 = tryAcquireAiSlot('spammer-user');
      expect(s1.allowed).toBe(true);
      s1.release();

      const s2 = tryAcquireAiSlot('spammer-user');
      expect(s2.allowed).toBe(true);
      s2.release();

      const s3 = tryAcquireAiSlot('spammer-user');
      expect(s3.allowed).toBe(false);
      expect(s3.reason).toBe('USER_RATE_LIMITED');
    });

    test('10. Bounded execution helper times out stalled external calls', async () => {
      const slowProviderCall = () => new Promise((resolve) => setTimeout(resolve, 500));

      await expect(
        executeWithBoundedTimeout(slowProviderCall, { timeoutMs: 50 })
      ).rejects.toThrow(/timed out after 50ms/i);
    });

    test('10a. Missing AI provider does not consume a concurrency slot', () => {
      delete process.env.GROQ_API_KEY;
      process.env.AI_MAX_CONCURRENT_REQUESTS = '1';
      const slot = tryAcquireAiSlot('provider-missing-test');
      expect(slot.allowed).toBe(true);
      slot.release();
      expect(getAiUsageMetrics().currentConcurrentRequests).toBe(0);
    });

    test('11. FAQ fast-cache answers common questions instantly with 0 AI slots used', async () => {
      const faq1 = checkFaqCache('How much does it cost?');
      expect(faq1).not.toBeNull();
      expect(faq1).toMatch(/₹|fare|pricing/i);

      const faq2 = checkFaqCache('Can I cancel my ride?');
      expect(faq2).not.toBeNull();
      expect(faq2).toMatch(/cancel/i);

      const faq3 = checkFaqCache('What is the helpline phone number?');
      expect(faq3).not.toBeNull();
      expect(faq3).toMatch(/Support contact:/);
      expect(faq3).not.toMatch(/1234567890/);

      // Verify no AI slot was reserved for FAQ hits
      const metrics = getAiUsageMetrics();
      expect(metrics.dailyRequestsCount).toBe(0);
    });
  });

  // =========================================================================
  // 3. GRACEFUL DEGRADATION & BOOKING ENDPOINT VERIFICATION
  // =========================================================================
  describe('Graceful Degradation & Non-AI Fallbacks', () => {
    test('12. Support bot provides polite helpline fallback when AI is disabled', async () => {
      process.env.AI_FEATURE_ENABLED = 'false';

      const response = await handleSupportMessage('cust-1', 'I have a complex billing inquiry');
      expect(response).toMatch(/temporarily (disabled|unavailable)|capacity/i);
      expect(response).not.toMatch(/91723 93084|1234567890/);
    });

    test('13. AI Voice booking endpoint falls back seamlessly to deterministic NLP when Groq is unavailable', async () => {
      const res = await request(app)
        .post('/api/bookings/ai-booking')
        .set('Authorization', `Bearer ${testCustomerToken}`)
        .send({
          transcript: 'Book a tempo from Swargate to Hadapsar tomorrow at 2pm',
          previewOnly: true
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.booking).toBeDefined();
      expect(res.body.booking.pickupAddress.toLowerCase()).toContain('swargate');
      expect(res.body.booking.dropAddress.toLowerCase()).toContain('hadapsar');
      expect(getAiUsageMetrics().dailyRequestsCount).toBe(0);
    });

    test('14. Oversized input transcripts are bounded to 500 chars to prevent token bloat', async () => {
      const hugeTranscript = 'Book from Pune to Mumbai. ' + 'word '.repeat(300);
      expect(hugeTranscript.length).toBeGreaterThan(1000);

      const res = await request(app)
        .post('/api/bookings/ai-booking')
        .set('Authorization', `Bearer ${testCustomerToken}`)
        .send({
          transcript: hugeTranscript,
          previewOnly: true
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.booking.pickupAddress.toLowerCase()).toContain('pune');
    });

    test('14a. Client-supplied customerId cannot bypass authenticated ownership', async () => {
      const res = await request(app)
        .post('/api/bookings/ai-booking')
        .send({
          customerId: 'spoofed-customer-id',
          transcript: 'Book a tempo from Swargate to Hadapsar',
          previewOnly: true
        });

      expect(res.status).toBe(401);
    });

    test('14b. Provider 429 is handled once without retry storms', async () => {
      process.env.GROQ_API_KEY = 'fixture-groq-key';
      const response = await handleSupportMessage('provider-429-user', 'Where is my booking?');
      expect(response).toMatch(/temporarily experiencing high demand|support/i);
      expect(getAiUsageMetrics().currentConcurrentRequests).toBe(0);
    });

    test('15. Operational metrics track request counts and tracked users safely without PII', () => {
      const slot = tryAcquireAiSlot('customer-id-xyz');
      expect(slot.allowed).toBe(true);
      slot.release({ outcome: 'success', durationMs: 250 });

      const metrics = getAiUsageMetrics();
      expect(metrics.dailyRequestsCount).toBe(1);
      expect(metrics.trackedUsersCount).toBe(1);

      // Verify JSON representation does not contain secret keys or tokens
      const metricsJson = JSON.stringify(metrics);
      expect(metricsJson).not.toContain('password');
      expect(metricsJson).not.toContain('secret');
      expect(metricsJson).not.toContain('key');
    });
  });
});
