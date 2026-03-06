// ─── Safety Filter Tests (100% branch target) ───────────────────────
import { describe, it, expect } from 'vitest';
import { filterOutput, type OutputSurface } from '../../processors/safety-filter.js';

describe('filterOutput', () => {
  // ── CSP-001: Prohibited Clinical Claims ──────────────────────

  it('blocks output with diagnosis claims (CSP-001)', () => {
    const result = filterOutput(
      'Based on our conversation, you have depression and you are diagnosed with GAD.',
      'PATIENT',
    );
    expect(result.passed).toBe(false);
    expect(result.violations.some(v => v.code === 'DIAG_CLAIM')).toBe(true);
    expect(result.violations[0].policy).toBe('CSP-001');
  });

  it('blocks output with medication recommendations (CSP-001)', () => {
    const result = filterOutput(
      'I recommend you should take 50mg of sertraline medication daily.',
      'PATIENT',
    );
    expect(result.passed).toBe(false);
    expect(result.violations.some(v => v.code === 'MED_RECOMMENDATION')).toBe(true);
  });

  it('blocks output claiming clinical role (CSP-001)', () => {
    const result = filterOutput(
      'As your therapist, I believe you need to...',
      'PATIENT',
    );
    expect(result.passed).toBe(false);
    expect(result.violations.some(v => v.code === 'ROLE_CLAIM')).toBe(true);
  });

  it('blocks output with order language (CSP-001)', () => {
    const result = filterOutput(
      'I am prescribing a new treatment plan.',
      'CLINICIAN',
    );
    expect(result.passed).toBe(false);
    expect(result.violations.some(v => v.code === 'ORDER_LANGUAGE')).toBe(true);
  });

  // ── CSP-002: DRAFT Labeling ──────────────────────────────────

  it('blocks clinician output missing DRAFT label (CSP-002)', () => {
    const result = filterOutput(
      'The patient shows improvement in mood scores.',
      'CLINICIAN',
    );
    // Missing DRAFT label is a violation — output gets blocked
    expect(result.passed).toBe(false);
    expect(result.modified).toBe(true);
    expect(result.violations.some(v => v.code === 'MISSING_DRAFT_LABEL')).toBe(true);
  });

  it('does not add DRAFT label when already present', () => {
    const result = filterOutput(
      '[AI-GENERATED DRAFT] The patient shows improvement in mood scores.',
      'CLINICIAN',
    );
    // If there are no other violations, the label should not be re-added
    expect(result.violations.filter(v => v.code === 'MISSING_DRAFT_LABEL')).toHaveLength(0);
  });

  it('skips DRAFT check for patient surface', () => {
    const result = filterOutput(
      'It sounds like things are going better for you this week.',
      'PATIENT',
    );
    expect(result.violations.filter(v => v.code === 'MISSING_DRAFT_LABEL')).toHaveLength(0);
  });

  it('skips DRAFT check when requireDraftLabel is false', () => {
    const result = filterOutput(
      'Internal analysis note.',
      'CLINICIAN',
      { requireDraftLabel: false },
    );
    expect(result.violations.filter(v => v.code === 'MISSING_DRAFT_LABEL')).toHaveLength(0);
  });

  // ── CSP-005: PHI Leakage ─────────────────────────────────────

  it('blocks patient-facing output referencing clinician notes (CSP-005)', () => {
    const result = filterOutput(
      'According to the clinician notes from your last session...',
      'PATIENT',
    );
    expect(result.passed).toBe(false);
    expect(result.violations.some(v => v.code === 'CLINICIAN_NOTE_LEAK')).toBe(true);
    expect(result.violations.some(v => v.policy === 'CSP-005')).toBe(true);
  });

  it('blocks patient-facing output with SOAP structure', () => {
    const result = filterOutput(
      'SOAP note: Subjective - patient reports pain. Objective - observed distress.',
      'PATIENT',
    );
    expect(result.passed).toBe(false);
    expect(result.violations.some(v => v.code === 'SOAP_LEAK')).toBe(true);
  });

  it('blocks patient-facing output with billing codes', () => {
    const result = filterOutput(
      'Your CPT billing code for this session is 90837.',
      'PATIENT',
    );
    expect(result.passed).toBe(false);
    expect(result.violations.some(v => v.code === 'ADMIN_LEAK')).toBe(true);
  });

  it('allows clinician-facing output with clinical terms', () => {
    const result = filterOutput(
      '[AI-GENERATED DRAFT] Treatment plan includes cognitive restructuring.',
      'CLINICIAN',
    );
    // Clinical terminology is acceptable for clinician surface
    expect(result.passed).toBe(true);
  });

  // ── Warnings ─────────────────────────────────────────────────

  it('warns about definitive condition language', () => {
    const result = filterOutput(
      '[AI-GENERATED DRAFT] The patient definitely has depression based on scores.',
      'CLINICIAN',
    );
    expect(result.warnings.some(w => w.code === 'DEFINITIVE_CONDITION')).toBe(true);
  });

  it('warns about diagnostic language', () => {
    const result = filterOutput(
      '[AI-GENERATED DRAFT] Patient meets criteria for major depressive disorder per DSM-5 criteria.',
      'CLINICIAN',
    );
    expect(result.warnings.some(w => w.code === 'DSM_REFERENCE' || w.code === 'DIAGNOSTIC_LANGUAGE')).toBe(true);
  });

  it('warns when crisis content lacks resources (patient surface)', () => {
    const result = filterOutput(
      'I understand you are in crisis right now. That must be very difficult.',
      'PATIENT',
    );
    expect(result.warnings.some(w => w.code === 'CRISIS_NO_RESOURCES')).toBe(true);
  });

  it('does not warn about crisis when resources are included', () => {
    const result = filterOutput(
      'If you are in crisis, please call 988 or reach out to your care team.',
      'PATIENT',
    );
    expect(result.warnings.filter(w => w.code === 'CRISIS_NO_RESOURCES')).toHaveLength(0);
  });

  // ── Clean pass-through ───────────────────────────────────────

  it('passes clean patient-facing output unchanged', () => {
    const clean = 'It sounds like you had a productive week! Would you like to explore what helped?';
    const result = filterOutput(clean, 'PATIENT');

    expect(result.passed).toBe(true);
    expect(result.modified).toBe(false);
    expect(result.filteredOutput).toBe(clean);
    expect(result.violations).toHaveLength(0);
  });

  it('passes clean clinician output with DRAFT label', () => {
    const clean = '[AI-GENERATED DRAFT] Patient reported improved sleep and reduced anxiety.';
    const result = filterOutput(clean, 'CLINICIAN');

    expect(result.passed).toBe(true);
    expect(result.modified).toBe(false);
  });

  it('passes INTERNAL surface output without restrictions', () => {
    const result = filterOutput(
      'Debug: signal band ELEVATED because of risk factors detected.',
      'INTERNAL',
    );
    // INTERNAL doesn't require DRAFT labels or PHI checks
    expect(result.violations.filter(v => v.code === 'MISSING_DRAFT_LABEL')).toHaveLength(0);
  });

  // ── Signal band validation ───────────────────────────────────

  it('warns when signal band mentioned without reasoning', () => {
    const result = filterOutput(
      '[AI-GENERATED DRAFT] Signal band: ELEVATED.',
      'CLINICIAN',
      { validateSignalBand: true },
    );
    expect(result.warnings.some(w => w.code === 'SIGNAL_BAND_NO_REASONING')).toBe(true);
  });

  it('does not warn when signal band has reasoning', () => {
    const result = filterOutput(
      '[AI-GENERATED DRAFT] Signal band: ELEVATED because patient expressed suicidal ideation.',
      'CLINICIAN',
      { validateSignalBand: true },
    );
    expect(result.warnings.filter(w => w.code === 'SIGNAL_BAND_NO_REASONING')).toHaveLength(0);
  });

  // ── Rejection messages ───────────────────────────────────────

  it('provides patient-friendly rejection message', () => {
    const result = filterOutput(
      'You are diagnosed with borderline personality disorder.',
      'PATIENT',
    );
    expect(result.filteredOutput).toContain('988');
    expect(result.filteredOutput).toContain('care team');
  });

  it('provides detailed rejection for clinician surface', () => {
    const result = filterOutput(
      'I am prescribing 100mg of medication daily.',
      'CLINICIAN',
    );
    expect(result.filteredOutput).toContain('safety filter');
    expect(result.filteredOutput).toContain('Violations');
  });
});
