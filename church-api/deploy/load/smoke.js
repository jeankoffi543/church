// Load / soak profile for the SaaS API (CHR-194).
//
//   k6 run -e BASE=https://api.churchapp.io church-api/deploy/load/smoke.js
//
// Hits central, unauthenticated endpoints only (health, plans, subdomain check)
// so it can run against production without creating data. For a tenant-facing
// soak, point BASE at a church host and add its /api/v1/public/* reads.

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE || 'http://127.0.0.1:8001';

export const options = {
  scenarios: {
    // Ramp to 50 concurrent users, hold for 10 min (soak), ramp down.
    soak: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '10m', target: 50 },
        { duration: '1m', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'], // <1% errors
    http_req_duration: ['p(95)<800'], // 95th percentile under 800ms
  },
};

export default function () {
  const health = http.get(`${BASE}/api/platform/health`);
  check(health, { 'health 200': (r) => r.status === 200 });

  const plans = http.get(`${BASE}/api/platform/plans`);
  check(plans, { 'plans 200': (r) => r.status === 200 });

  const slug = `loadtest-${__VU}-${__ITER}`;
  const subdomain = http.get(`${BASE}/api/platform/signup/subdomain?subdomain=${slug}`);
  check(subdomain, { 'subdomain 200': (r) => r.status === 200 });

  sleep(1);
}
