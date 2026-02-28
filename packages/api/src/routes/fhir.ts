// ─── FHIR R4 Routes ──────────────────────────────────────────────────
// Exposes patient clinical data as FHIR R4 resources for EHR integration.

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

export const fhirRouter = Router();

fhirRouter.use(authenticate);

const FHIR_BASE = 'https://api.peacefull.ai/fhir/r4';

// ─── GET /Patient/:id ───────────────────────────────────────────────

/**
 * Returns a FHIR R4 Patient resource.
 */
fhirRouter.get('/Patient/:id', (req, res) => {
  res.json({
    resourceType: 'Patient',
    id: req.params.id,
    meta: {
      versionId: '1',
      lastUpdated: '2025-12-10T00:00:00.000Z',
      profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'],
    },
    identifier: [
      {
        system: `${FHIR_BASE}/identifier/mrn`,
        value: `MRN-${req.params.id.slice(0, 8).toUpperCase()}`,
      },
    ],
    active: true,
    name: [
      {
        use: 'official',
        family: 'Rivera',
        given: ['Alex'],
      },
    ],
    gender: 'other',
    birthDate: '1991-03-14',
    address: [
      {
        use: 'home',
        city: 'Portland',
        state: 'OR',
        postalCode: '97201',
        country: 'US',
      },
    ],
    telecom: [
      { system: 'phone', value: '+15551234567', use: 'mobile' },
      { system: 'email', value: 'alex.rivera@example.com', use: 'home' },
    ],
    communication: [
      {
        language: {
          coding: [{ system: 'urn:ietf:bcp:47', code: 'en', display: 'English' }],
        },
        preferred: true,
      },
    ],
  });
});

// ─── GET /Observation ────────────────────────────────────────────────

/**
 * Returns FHIR R4 Observation resources (MBC scores, check-in data).
 * Supports `?patient=` query parameter.
 */
fhirRouter.get('/Observation', (req, res) => {
  const patientId = req.query.patient as string ?? 'p1000000-0000-0000-0000-000000000001';

  res.json({
    resourceType: 'Bundle',
    type: 'searchset',
    total: 2,
    entry: [
      {
        resource: {
          resourceType: 'Observation',
          id: 'obs-phq9-001',
          meta: { lastUpdated: '2025-12-01T00:00:00.000Z' },
          status: 'final',
          category: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'survey',
                  display: 'Survey',
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '44249-1',
                display: 'PHQ-9 total score',
              },
            ],
          },
          subject: { reference: `Patient/${patientId}` },
          effectiveDateTime: '2025-12-01',
          valueInteger: 14,
          interpretation: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                  code: 'H',
                  display: 'High',
                },
              ],
              text: 'Moderate depression',
            },
          ],
        },
      },
      {
        resource: {
          resourceType: 'Observation',
          id: 'obs-gad7-001',
          meta: { lastUpdated: '2025-12-01T00:00:00.000Z' },
          status: 'final',
          category: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'survey',
                  display: 'Survey',
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '70274-6',
                display: 'GAD-7 total score',
              },
            ],
          },
          subject: { reference: `Patient/${patientId}` },
          effectiveDateTime: '2025-12-01',
          valueInteger: 11,
          interpretation: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                  code: 'H',
                  display: 'High',
                },
              ],
              text: 'Moderate anxiety',
            },
          ],
        },
      },
    ],
  });
});

// ─── GET /Condition/:patientId ───────────────────────────────────────

/**
 * Returns FHIR R4 Condition resources for a patient.
 */
fhirRouter.get('/Condition/:patientId', (req, res) => {
  res.json({
    resourceType: 'Bundle',
    type: 'searchset',
    total: 1,
    entry: [
      {
        resource: {
          resourceType: 'Condition',
          id: 'cond-001',
          meta: { lastUpdated: '2025-06-15T00:00:00.000Z' },
          clinicalStatus: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
                code: 'active',
                display: 'Active',
              },
            ],
          },
          verificationStatus: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
                code: 'confirmed',
                display: 'Confirmed',
              },
            ],
          },
          category: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/condition-category',
                  code: 'encounter-diagnosis',
                  display: 'Encounter Diagnosis',
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: 'http://hl7.org/fhir/sid/icd-10-cm',
                code: 'F33.1',
                display: 'Major depressive disorder, recurrent, moderate',
              },
            ],
            text: 'Major Depressive Disorder, Recurrent',
          },
          subject: { reference: `Patient/${req.params.patientId}` },
          onsetDateTime: '2024-01-15',
          recordedDate: '2025-06-15',
        },
      },
    ],
  });
});

// ─── GET /DocumentReference ──────────────────────────────────────────

/**
 * Returns FHIR R4 DocumentReference resources (session notes).
 */
fhirRouter.get('/DocumentReference', (req, res) => {
  const patientId = req.query.patient as string ?? 'p1000000-0000-0000-0000-000000000001';

  res.json({
    resourceType: 'Bundle',
    type: 'searchset',
    total: 1,
    entry: [
      {
        resource: {
          resourceType: 'DocumentReference',
          id: 'docref-001',
          meta: { lastUpdated: '2025-12-08T11:00:00.000Z' },
          status: 'current',
          type: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '11488-4',
                display: 'Consult note',
              },
            ],
          },
          subject: { reference: `Patient/${patientId}` },
          date: '2025-12-08T10:00:00.000Z',
          author: [{ reference: 'Practitioner/c1000000-0000-0000-0000-000000000001' }],
          content: [
            {
              attachment: {
                contentType: 'text/plain',
                title: 'Session Note — 2025-12-08',
              },
            },
          ],
          context: {
            encounter: [{ reference: 'Encounter/enc-001' }],
          },
        },
      },
    ],
  });
});

// ─── GET /Flag ───────────────────────────────────────────────────────

/**
 * Returns FHIR R4 Flag resources (clinical escalations).
 */
fhirRouter.get('/Flag', (req, res) => {
  const patientId = req.query.patient as string ?? 'p2000000-0000-0000-0000-000000000002';

  res.json({
    resourceType: 'Bundle',
    type: 'searchset',
    total: 1,
    entry: [
      {
        resource: {
          resourceType: 'Flag',
          id: 'flag-001',
          meta: { lastUpdated: '2025-12-10T08:00:00.000Z' },
          status: 'active',
          category: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/flag-category',
                  code: 'clinical',
                  display: 'Clinical',
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: `${FHIR_BASE}/CodeSystem/escalation-tier`,
                code: 'T2',
                display: 'Tier 2 — Clinician Review Required',
              },
            ],
            text: 'ELEVATED signal band — hopelessness themes detected',
          },
          subject: { reference: `Patient/${patientId}` },
          period: {
            start: '2025-12-10T07:55:00.000Z',
          },
        },
      },
    ],
  });
});

// ─── GET /CareTeam/:patientId ────────────────────────────────────────

/**
 * Returns a FHIR R4 CareTeam resource for a patient.
 */
fhirRouter.get('/CareTeam/:patientId', (req, res) => {
  res.json({
    resourceType: 'CareTeam',
    id: `careteam-${req.params.patientId}`,
    meta: { lastUpdated: '2025-12-01T00:00:00.000Z' },
    status: 'active',
    name: 'Behavioral Health Care Team',
    subject: { reference: `Patient/${req.params.patientId}` },
    participant: [
      {
        role: [
          {
            coding: [
              {
                system: 'http://snomed.info/sct',
                code: '224587008',
                display: 'Psychotherapist',
              },
            ],
          },
        ],
        member: {
          reference: 'Practitioner/c1000000-0000-0000-0000-000000000001',
          display: 'Dr. Sarah Chen',
        },
      },
      {
        role: [
          {
            coding: [
              {
                system: 'http://snomed.info/sct',
                code: '80584001',
                display: 'Psychiatrist',
              },
            ],
          },
        ],
        member: {
          reference: 'Practitioner/c2000000-0000-0000-0000-000000000002',
          display: 'Dr. James Park',
        },
      },
    ],
    managingOrganization: [
      {
        reference: 'Organization/t1000000-0000-0000-0000-000000000001',
        display: 'Peacefull Demo Clinic',
      },
    ],
  });
});
