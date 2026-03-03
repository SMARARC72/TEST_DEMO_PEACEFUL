// ─── Peacefull.ai Load Test ──────────────────────────────────────────
// k6 script for pre-launch load testing (Phase 8, Step 7)
// Target: 500 concurrent users across critical API paths
//
// Run: k6 run --env BASE_URL=https://api.peacefull.cloud packages/infra/k6/load-test.js

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ─── Custom Metrics ──────────────────────────────────────────────────

const errorRate = new Rate('error_rate');
const loginDuration = new Trend('login_duration', true);
const submissionDuration = new Trend('submission_duration', true);
const caseloadDuration = new Trend('caseload_duration', true);

// ─── Configuration ──────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

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
  { email: 'test.patient.1@peacefull.cloud', password: 'Demo2026!' },
  { email: 'test.patient.2@peacefull.cloud', password: 'Demo2026!' },
  { email: 'test.patient.3@peacefull.cloud', password: 'Demo2026!' },
];

const TEST_CLINICIANS = [
  { email: 'pilot.clinician.1@peacefull.cloud', password: 'Demo2026!' },
  { email: 'pilot.clinician.2@peacefull.cloud', password: 'Demo2026!' },
];

// ─── Helpers ─────────────────────────────────────────────────────────

function login(email, password) {
  const res = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
    email, password,
  }), { headers: { 'Content-Type': 'application/json' } });

  loginDuration.add(res.timings.duration);

  const ok = check(res, {
    'login status 200': (r) => r.status === 200,
    'login has token':  (r) => r.json('data.accessToken') !== undefined,
  });
  errorRate.add(!ok);

  if (!ok) return null;
  return {
    token: res.json('data.accessToken'),
    userId: res.json('data.user.id'),
  };
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

// Pre-authenticate all test users in setup phase (runs once)
export function setup() {
  const sessions = { patients: [], clinicians: [] };

  for (const creds of TEST_PATIENTS) {
    const session = login(creds.email, creds.password);
    if (session) {
      sessions.patients.push(session);
    }
    sleep(2); // avoid rate limits during setup
  }

  for (const creds of TEST_CLINICIANS) {
    const session = login(creds.email, creds.password);
    if (session) {
      sessions.clinicians.push(session);
    }
    sleep(2);
  }

  return sessions;
}

export default function (sessions) {
  const isClinicianFlow = Math.random() < 0.3; // 30% clinician, 70% patient

  if (isClinicianFlow && sessions.clinicians.length > 0) {
    clinicianFlow(sessions.clinicians);
  } else if (sessions.patients.length > 0) {
    patientFlow(sessions.patients);
  }

  sleep(Math.random() * 2 + 1); // 1-3s think time
}

function patientFlow(patients) {
  const session = patients[Math.floor(Math.random() * patients.length)];
  const { token, userId } = session;

  group('Patient - Home', () => {
    const res = http.get(`${BASE_URL}/api/v1/patients/${userId}`, authHeaders(token));
    check(res, { 'patient home 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
  });

  group('Patient - Submit Check-in', () => {
    const res = http.post(`${BASE_URL}/api/v1/patients/${userId}/checkin`, JSON.stringify({
      mood: Math.floor(Math.random() * 10) + 1,
      stress: Math.floor(Math.random() * 10) + 1,
      sleep: Math.floor(Math.random() * 10) + 1,
      focus: Math.floor(Math.random() * 10) + 1,
      notes: 'Load test check-in submission',
    }), authHeaders(token));

    submissionDuration.add(res.timings.duration);
    check(res, { 'checkin 201': (r) => r.status === 201 || r.status === 200 });
    errorRate.add(res.status >= 400);
  });

  group('Patient - View History', () => {
    const res = http.get(`${BASE_URL}/api/v1/patients/${userId}/history`, authHeaders(token));
    check(res, { 'history 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
  });

  group('Patient - View Safety Plan', () => {
    const res = http.get(`${BASE_URL}/api/v1/patients/${userId}/safety-plan`, authHeaders(token));
    check(res, { 'safety-plan 200|404': (r) => r.status === 200 || r.status === 404 });
    errorRate.add(res.status >= 500);
  });
}

function clinicianFlow(clinicians) {
  const session = clinicians[Math.floor(Math.random() * clinicians.length)];
  const { token } = session;

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
