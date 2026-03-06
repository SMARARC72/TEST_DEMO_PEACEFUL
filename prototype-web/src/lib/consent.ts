import type { ConsentRecord } from '@/api/types';

export interface RawConsentRecord {
  id: string;
  patientId?: string;
  consentType?: string;
  accepted?: boolean;
  acceptedAt?: string;
  revokedAt?: string | null;
  version: string | number;
  type?: string;
  granted?: boolean;
  grantedAt?: string;
}

export interface ConsentItem {
  id: string;
  label: string;
  description: string;
  version: string;
}

export const CURRENT_CONSENT_VERSION = 3;

export const REQUIRED_CONSENT_TYPES = [
  'data-collection',
  'ai-processing',
  'not-emergency',
] as const;

export const PATIENT_CONSENT_ITEMS: ConsentItem[] = [
  {
    id: 'data-collection',
    label: 'Data Collection & Use',
    description:
      'I understand that this application collects health-related data including mood check-ins, journal entries, and voice memos. This data is encrypted at rest (AES-256) and in transit (TLS 1.3), stored in HIPAA-compliant infrastructure covered by Business Associate Agreements, and shared only with my assigned clinician(s).',
    version: '3.0',
  },
  {
    id: 'ai-processing',
    label: 'AI-Assisted Processing',
    description:
      'I understand that AI technology (Anthropic Claude, HIPAA-eligible) is used to generate draft summaries, signal analysis, and conversational support. All AI outputs are clearly labeled as drafts and must be reviewed by a licensed clinician before clinical action is taken. AI does not make clinical decisions. I may opt out of AI features at any time.',
    version: '3.0',
  },
  {
    id: 'substance-use-42cfr',
    label: '42 CFR Part 2 — Substance Use Records',
    description:
      'I understand that any substance use information I share is protected under 42 CFR Part 2 (Confidentiality of Substance Use Disorder Patient Records). This data requires my specific written consent before it can be disclosed to anyone, including other healthcare providers, insurance companies, or law enforcement. I may revoke this consent at any time. Substance use data is stored with additional encryption and access controls beyond standard PHI protections.',
    version: '3.0',
  },
  {
    id: 'not-emergency',
    label: 'Emergency Services Disclaimer',
    description:
      'I understand that this application is not a substitute for emergency services. If I am in immediate danger or experiencing a psychiatric emergency, I should call 911 or the 988 Suicide & Crisis Lifeline. The AI companion is not a crisis service and cannot contact emergency responders.',
    version: '3.0',
  },
  {
    id: 'data-retention',
    label: 'Data Retention & Deletion Rights',
    description:
      'I understand that my data is retained for 7 years per HIPAA requirements. I have the right to request data export (CSV/JSON) and account deletion at any time through Settings. Upon account deletion, my data will be anonymized per retention policy. I may withdraw any specific consent at any time through Settings without affecting my access to the platform.',
    version: '3.0',
  },
  {
    id: 'sms-communications',
    label: 'SMS Communications (TCPA)',
    description:
      'I consent to receive SMS text messages from Peacefull at the phone number I provide, including appointment reminders, check-in nudges, and critical safety alerts. Message and data rates may apply. I understand I can opt out at any time by texting STOP or toggling off SMS in Settings. My phone number will be stored securely and used only for authorized communications. This consent is not a condition of receiving care.',
    version: '3.0',
  },
];

export function normalizeConsentRecord(record: RawConsentRecord): ConsentRecord {
  return {
    id: record.id,
    patientId: record.patientId ?? '',
    consentType: record.consentType ?? record.type ?? '',
    accepted: record.accepted ?? record.granted ?? false,
    acceptedAt: record.acceptedAt ?? record.grantedAt,
    revokedAt: record.revokedAt ?? null,
    version: String(record.version),
  };
}

export function hasRequiredConsent(records: ConsentRecord[]): boolean {
  const grantedTypes = new Set(
    records.filter((record) => record.accepted).map((record) => record.consentType),
  );
  return REQUIRED_CONSENT_TYPES.every((consentType) => grantedTypes.has(consentType));
}