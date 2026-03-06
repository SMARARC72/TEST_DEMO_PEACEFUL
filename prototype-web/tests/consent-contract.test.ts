import { describe, expect, it } from 'vitest';
import {
  hasRequiredConsent,
  normalizeConsentRecord,
  REQUIRED_CONSENT_TYPES,
} from '../src/lib/consent';

describe('consent contract helpers', () => {
  it('normalizes legacy API consent fields into the frontend contract', () => {
    const record = normalizeConsentRecord({
      id: 'consent-001',
      patientId: 'patient-001',
      type: 'data-collection',
      granted: true,
      grantedAt: '2026-03-06T00:00:00.000Z',
      version: 3,
    });

    expect(record).toEqual({
      id: 'consent-001',
      patientId: 'patient-001',
      consentType: 'data-collection',
      accepted: true,
      acceptedAt: '2026-03-06T00:00:00.000Z',
      revokedAt: null,
      version: '3',
    });
  });

  it('only unlocks protected patient routes when all required consents are granted', () => {
    const required = REQUIRED_CONSENT_TYPES.map((consentType) => ({
      id: consentType,
      patientId: 'patient-001',
      consentType,
      accepted: true,
      acceptedAt: '2026-03-06T00:00:00.000Z',
      version: '3',
    }));

    expect(hasRequiredConsent(required)).toBe(true);
    expect(hasRequiredConsent(required.slice(0, 2))).toBe(false);
  });
});