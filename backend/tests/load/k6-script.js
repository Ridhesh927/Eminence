import http from 'k6/http';
import { check, sleep } from 'k6';

// Define the configuration for the load test
export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 users over 30 seconds
    { duration: '1m', target: 20 },   // Stay at 20 users for 1 minute
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    // 95% of requests must complete below 500ms
    http_req_duration: ['p(95)<500'],
    // Less than 1% of requests should fail
    http_req_failed: ['rate<0.01'], 
  },
};

const BASE_URL = 'http://localhost:3000'; // Adjust port if your backend runs elsewhere

export default function () {
  // 1. Test Health Check or generic endpoints
  // Assuming there's a basic API endpoint, if not, hitting a non-existent route just to test Express overhead
  // Since we know rate limiters are active, we might hit 429 Too Many Requests if we push too hard.
  const res = http.get(`${BASE_URL}/`);
  
  // Verify the response
  check(res, {
    'status is 200 or 404 (not 500)': (r) => r.status !== 500,
    'rate limit not hit (status != 429)': (r) => r.status !== 429,
  });

  // 2. Test Auth Endpoint (Simulating traffic to auth limiter which is 30 req/15min)
  // Be careful: this will trigger the 429 very quickly in a load test!
  /*
  const authRes = http.post(`${BASE_URL}/api/auth/phone-login`, JSON.stringify({ phone: '1234567890' }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(authRes, {
    'auth rate limit triggered': (r) => r.status === 429 || r.status === 200,
  });
  */

  // Pause for 1 second between virtual user iterations
  sleep(1);
}
