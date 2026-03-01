// ─── Peacefull.ai Load Test ──────────────────────────────────────────
// k6 script for pre-launch load testing (Phase 8, Step 7)
// Target: 500 concurrent users across critical API paths
//
// Run: k6 run --env BASE_URL=https://api.peacefull.ai packages/infra/k6/load-test.js

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ─── Custom Metrics ──────────────────────────────────────────────────

const errorRate = new Rate('error_rate');
const loginDuration = new Trend('login_duration', true);
const submissionDuration = new Trend('submission_duration', true);
const caseloadDuration = new Trend('caseload_duration', true);

// ─── Configuration ──────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '1m',  target: 50 },   // ramp up
    { duration: '3m',  target: 200 },   // sustained moderate
    { duration: '3m',  target: 500 },   // peak load
    { duration: '2m',  target: 500 },   // sustained peak
    { duration: '1m',  target: 0 },     // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1500'],  // 95th < 500ms, 99th < 1.5s
    error_rate:        ['rate<0.01'],                  // < 1% error rate
    login_duration:    ['p(95)<800'],
    submission_duration: ['p(95)<1000'],
    caseload_duration: ['p(95)<600'],
  },
};

// ─── Test Data ───────────────────────────────────────────────────────

const TEST_PATIENTS = [
  { email: 'loadtest-patient-1@peacefull.ai', password: 'LoadTest1!Secure' },
  { email: 'loadtest-patient-2@peacefull.ai', password: 'LoadTest2!Secure' },
  { email: 'loadtest-patient-3@peacefull.ai', password: 'LoadTest3!Secure' },
];

const TEST_CLINICIANS = [
  { email: 'loadtest-clinician-1@peacefull.ai', password: 'LoadTest1!Secure' },
  { email: 'loadtest-clinician-2@peacefull.ai', password: 'LoadTest2!Secure' },
];

// ─── Helpers ─────────────────────────────────────────────────────────

function login(email, password) {
  const res = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
    email, password,
  }), { headers: { 'Content-Type': 'application/json' } });

  loginDuration.add(res.timings.duration);

  const ok = check(res, {
    'login status 200': (r) => r.status === 200,
    'login has token':  (r) => r.json('accessToken') !== undefined,
  });
  errorRate.add(!ok);

  return ok ? res.json('accessToken') : null;
}

function authHeaders(token) {
  return {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
}

// ─── Scenarios ───────────────────────────────────────────────────────

export default function () {
  const isClinicianFlow = Math.random() < 0.3; // 30% clinician, 70% patient

  if (isClinicianFlow) {
    clinicianFlow();
  } else {
    patientFlow();
  }

  sleep(Math.random() * 2 + 1); // 1-3s think time
}

function patientFlow() {
  const creds = TEST_PATIENTS[Math.floor(Math.random() * TEST_PATIENTS.length)];
  const token = login(creds.email, creds.password);
  if (!token) return;

  group('Patient - Home', () => {
    const res = http.get(`${BASE_URL}/api/v1/patients/me`, authHeaders(token));
    check(res, { 'patient home 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
  });

  group('Patient - Submit Check-in', () => {
    const res = http.post(`${BASE_URL}/api/v1/patients/me/checkin`, JSON.stringify({
      mood: Math.floor(Math.random() * 5) + 1,
      sleep: Math.floor(Math.random() * 5) + 1,
      anxiety: Math.floor(Math.random() * 5) + 1,
      notes: 'Load test check-in submission',
    }), authHeaders(token));

    submissionDuration.add(res.timings.duration);
    check(res, { 'checkin 201': (r) => r.status === 201 || r.status === 200 });
    errorRate.add(res.status >= 400);
  });

  group('Patient - View History', () => {
    const res = http.get(`${BASE_URL}/api/v1/patients/me/history`, authHeaders(token));
    check(res, { 'history 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
  });

  group('Patient - View Safety Plan', () => {
    const res = http.get(`${BASE_URL}/api/v1/patients/me/safety-plan`, authHeaders(token));
    check(res, { 'safety-plan 200|404': (r) => r.status === 200 || r.status === 404 });
    errorRate.add(res.status >= 500);
  });
}

function clinicianFlow() {
  const creds = TEST_CLINICIANS[Math.floor(Math.random() * TEST_CLINICIANS.length)];
  const token = login(creds.email, creds.password);
  if (!token) return;

  group('Clinician - Dashboard', () => {
    const res = http.get(`${BASE_URL}/api/v1/clinician/dashboard`, authHeaders(token));
    check(res, { 'dashboard 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
  });

  group('Clinician - Caseload', () => {
    const res = http.get(`${BASE_URL}/api/v1/clinician/caseload`, authHeaders(token));
    caseloadDuration.add(res.timings.duration);
    check(res, { 'caseload 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
  });

  group('Clinician - Triage Queue', () => {
    const res = http.get(`${BASE_URL}/api/v1/clinician/triage`, authHeaders(token));
    check(res, { 'triage 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
  });

  group('Clinician - Escalations', () => {
    const res = http.get(`${BASE_URL}/api/v1/clinician/escalations`, authHeaders(token));
    check(res, { 'escalations 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
  });
}
