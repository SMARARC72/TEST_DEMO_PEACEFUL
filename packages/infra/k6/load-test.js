// ─── Peacefull.ai Load Test ──────────────────────────────────────────
// k6 script for pre-launch load testing (UGO-4)
// Target: Ramp to 50 concurrent users across critical API paths
// (adjust VUs for production staging targets)
//
// Run:   k6 run packages/infra/k6/load-test.js
// Env:   k6 run --env BASE_URL=https://api-staging.peacefull.cloud packages/infra/k6/load-test.js
//
// NOTE: The `X-Load-Test` header is required to bypass per-IP rate
//       limits during performance testing. The API server only honours
//       this header when NODE_ENV !== 'production'.

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ─── Custom Metrics ──────────────────────────────────────────────────

const errorRate = new Rate('error_rate');
const loginDuration = new Trend('login_duration', true);
const submissionDuration = new Trend('submission_duration', true);
const caseloadDuration = new Trend('caseload_duration', true);
const readDuration = new Trend('read_duration', true);

// ─── Configuration ──────────────────────────────────────────────────
// UGO-1.6: Port 3001 matches API server default (packages/api/src/config/env.ts)

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

// Load test header — bypasses per-IP rate limits in non-prod environments
const LOAD_TEST_SECRET = __ENV.LOAD_TEST_SECRET || 'k6-peacefull-load-2026';

// Stages can be overridden via env for CI vs. manual runs
const MAX_VUS = parseInt(__ENV.K6_VUS_MAX || '50', 10);

export const options = {
  stages: [
    { duration: '30s', target: Math.ceil(MAX_VUS * 0.2) },  // warm-up
    { duration: '1m',  target: Math.ceil(MAX_VUS * 0.6) },  // moderate load
    { duration: '2m',  target: MAX_VUS },                     // peak load
    { duration: '1m',  target: MAX_VUS },                     // sustained peak
    { duration: '30s', target: 0 },                           // ramp down
  ],
  thresholds: {
    http_req_duration:   ['p(95)<500', 'p(99)<1500'],   // 95th < 500ms, 99th < 1.5s
    error_rate:          ['rate<0.05'],                   // < 5% error rate (accounts for rate-limited checkins)
    login_duration:      ['p(95)<800'],                   // auth endpoint with bcrypt
    submission_duration: ['p(95)<1000'],                   // check-in (async via BullMQ)
    caseload_duration:   ['p(95)<600'],                   // clinician caseload
    read_duration:       ['p(95)<400'],                   // read-only endpoints
  },
};

// ─── Test Data ───────────────────────────────────────────────────────
// These must match the seeded database users (prisma/seed.ts).
// Password for all seeded users: Demo2026!

const PASSWORD = 'Demo2026!';

// Patients (mfaEnabled: false → returns token directly)
const TEST_PATIENTS = [
  { email: 'maria.santos@example.com',   userId: '30000000-0000-4000-8000-000000000001' },
  { email: 'james.chen@example.com',     userId: '30000000-0000-4000-8000-000000000002' },
  { email: 'emma.thompson@example.com',  userId: '30000000-0000-4000-8000-000000000003' },
];

// Clinicians (mfaEnabled: true → login returns mfaRequired, so we
// authenticate them via the MFA bypass only available in test env.
// For now the load test focuses on patient flows and uses the
// clinician token obtained during setup if MFA is disabled.)
const TEST_CLINICIANS = [
  { email: 'sarah.chen@peacefull.ai',                userId: '20000000-0000-4000-8000-000000000001' },
  { email: 'james.wilson@peacefull.ai',              userId: '20000000-0000-4000-8000-000000000002' },
  { email: 'maria.rodriguez-clinician@peacefull.ai', userId: '20000000-0000-4000-8000-000000000003' },
];

// ─── Helpers ─────────────────────────────────────────────────────────

const baseHeaders = {
  'Content-Type': 'application/json',
  'X-Load-Test': LOAD_TEST_SECRET,
};

function login(email, password) {
  const res = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
    email, password,
  }), { headers: baseHeaders });

  loginDuration.add(res.timings.duration);

  // Clinicians have MFA enabled — login returns { mfaRequired: true }.
  // We detect this and return a partial session (no token).
  if (res.status === 200) {
    const body = res.json();
    if (body && body.data && body.data.mfaRequired) {
      console.log(`  ⚠  MFA required for ${email} — clinician flows will use read-only health checks`);
      return { mfaRequired: true, userId: body.data.userId };
    }
    const ok = check(res, {
      'login status 200':  () => true,
      'login has token':   () => body.data && body.data.accessToken !== undefined,
    });
    errorRate.add(!ok);
    if (!ok) return null;
    return {
      token: body.data.accessToken,
      userId: body.data.user.id,
    };
  }

  // Non-200 = credential error
  check(res, { 'login status 200': (r) => r.status === 200 });
  errorRate.add(true);
  console.error(`  ✗  Login failed for ${email}: HTTP ${res.status} — ${res.body}`);
  return null;
}

function authHeaders(token) {
  return {
    headers: {
      ...baseHeaders,
      'Authorization': `Bearer ${token}`,
    },
  };
}

// ─── Scenarios ───────────────────────────────────────────────────────

export function setup() {
  console.log(`\n🔬 Peacefull.ai Load Test — target ${MAX_VUS} VUs against ${BASE_URL}\n`);

  // Quick health check
  const hc = http.get(`${BASE_URL}/health`, { headers: baseHeaders });
  check(hc, { 'healthcheck ok': (r) => r.status === 200 });
  if (hc.status !== 200) {
    console.error('❌ API health check failed — aborting');
    return { patients: [], clinicians: [] };
  }
  console.log(`✓ API health: ${hc.body}\n`);

  const sessions = { patients: [], clinicians: [] };

  // Authenticate patients (no MFA)
  for (const p of TEST_PATIENTS) {
    const session = login(p.email, PASSWORD);
    if (session && session.token) {
      sessions.patients.push(session);
      console.log(`  ✓ Patient authenticated: ${p.email} → userId ${session.userId}`);
    } else {
      console.warn(`  ✗ Patient login failed: ${p.email}`);
    }
    sleep(1);
  }

  // Attempt clinician auth — will get MFA challenge
  for (const c of TEST_CLINICIANS) {
    const session = login(c.email, PASSWORD);
    if (session && session.token) {
      sessions.clinicians.push(session);
      console.log(`  ✓ Clinician authenticated: ${c.email}`);
    } else if (session && session.mfaRequired) {
      console.log(`  ℹ Clinician MFA required: ${c.email} (expected — MFA flow validated)`);
    } else {
      console.warn(`  ✗ Clinician login failed: ${c.email}`);
    }
    sleep(1);
  }

  console.log(`\n📊 Setup complete: ${sessions.patients.length} patient sessions, ${sessions.clinicians.length} clinician sessions`);
  if (sessions.patients.length === 0) {
    console.error('⚠  No patient sessions — test will only exercise health/ready endpoints');
  }
  console.log('');

  return sessions;
}

export default function (sessions) {
  // Without authenticated sessions, fall back to health-only checks
  if (!sessions.patients || sessions.patients.length === 0) {
    healthOnlyFlow();
    sleep(1);
    return;
  }

  // 70% patient flow, 20% clinician read flow (if available), 10% health
  const roll = Math.random();
  if (roll < 0.7) {
    patientFlow(sessions.patients);
  } else if (roll < 0.9 && sessions.clinicians.length > 0) {
    clinicianFlow(sessions.clinicians);
  } else {
    healthOnlyFlow();
  }

  sleep(Math.random() * 2 + 1); // 1-3s think time
}

// ─── Flow: Health-only (unauthenticated) ────────────────────────────

function healthOnlyFlow() {
  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/health`, { headers: baseHeaders });
    readDuration.add(res.timings.duration);
    check(res, { 'health 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
  });
}

// ─── Flow: Patient ──────────────────────────────────────────────────

function patientFlow(patients) {
  const session = patients[Math.floor(Math.random() * patients.length)];
  const { token, userId } = session;

  group('Patient - Profile', () => {
    const res = http.get(`${BASE_URL}/api/v1/patients/${userId}`, authHeaders(token));
    readDuration.add(res.timings.duration);
    check(res, { 'patient profile 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200 && res.status !== 404);
  });

  group('Patient - Submit Check-in', () => {
    const payload = JSON.stringify({
      mood: Math.floor(Math.random() * 10) + 1,
      stress: Math.floor(Math.random() * 10) + 1,
      sleep: Math.floor(Math.random() * 10) + 1,
      focus: Math.floor(Math.random() * 10) + 1,
      notes: 'k6 load test check-in',
    });
    const res = http.post(
      `${BASE_URL}/api/v1/patients/${userId}/checkin`,
      payload,
      authHeaders(token),
    );
    submissionDuration.add(res.timings.duration);
    // 201 = created (inline), 202 = accepted (queued via BullMQ), 429 = rate limited (expected)
    const ok = res.status === 201 || res.status === 202 || res.status === 200;
    check(res, { 'checkin 2xx': () => ok });
    // Don't count 429 as errors — they're expected from the 1-per-minute checkin limiter
    errorRate.add(res.status >= 400 && res.status !== 429);
  });

  group('Patient - Submissions History', () => {
    const res = http.get(`${BASE_URL}/api/v1/patients/${userId}/submissions`, authHeaders(token));
    readDuration.add(res.timings.duration);
    check(res, { 'submissions 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
  });

  group('Patient - Safety Plan', () => {
    const res = http.get(`${BASE_URL}/api/v1/patients/${userId}/safety-plan`, authHeaders(token));
    readDuration.add(res.timings.duration);
    // 200 = has plan, 404 = no plan yet — both are valid
    check(res, { 'safety-plan 200|404': (r) => r.status === 200 || r.status === 404 });
    errorRate.add(res.status >= 500);
  });

  group('Patient - Progress', () => {
    const res = http.get(`${BASE_URL}/api/v1/patients/${userId}/progress`, authHeaders(token));
    readDuration.add(res.timings.duration);
    check(res, { 'progress 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200 && res.status !== 404);
  });
}

// ─── Flow: Clinician ────────────────────────────────────────────────

function clinicianFlow(clinicians) {
  const session = clinicians[Math.floor(Math.random() * clinicians.length)];
  const { token } = session;

  group('Clinician - Dashboard', () => {
    const res = http.get(`${BASE_URL}/api/v1/clinician/dashboard`, authHeaders(token));
    readDuration.add(res.timings.duration);
    check(res, { 'dashboard 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
  });

  group('Clinician - Caseload', () => {
    const res = http.get(`${BASE_URL}/api/v1/clinician/caseload`, authHeaders(token));
    caseloadDuration.add(res.timings.duration);
    check(res, { 'caseload 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
  });

  group('Clinician - Triage', () => {
    const res = http.get(`${BASE_URL}/api/v1/clinician/triage`, authHeaders(token));
    readDuration.add(res.timings.duration);
    check(res, { 'triage 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
  });

  group('Clinician - Escalations', () => {
    const res = http.get(`${BASE_URL}/api/v1/clinician/escalations`, authHeaders(token));
    readDuration.add(res.timings.duration);
    check(res, { 'escalations 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
  });
}

// ─── Teardown ────────────────────────────────────────────────────────

export function teardown(sessions) {
  console.log('\n📋 Load test complete');
  console.log(`   Patient sessions used: ${sessions.patients ? sessions.patients.length : 0}`);
  console.log(`   Clinician sessions used: ${sessions.clinicians ? sessions.clinicians.length : 0}`);
  console.log('');
}
