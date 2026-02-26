/**
 * Unit Tests for Deterministic Calculators
 * Part of Peacefull.ai Demo technical debt cleanup - Step 3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the state module before importing helpers
vi.mock('../public/js/state.js', () => ({
  state: {
    triageQueue: [],
    memoryItems: [],
    planItems: [],
    enterpriseItems: [],
    selectedTriageId: null,
    selectedMemoryId: null,
    selectedPlanId: null,
    selectedEnterpriseId: null,
  },
}));

// Import the mocked state so we can modify it in tests
import { state as mockState } from '../public/js/state.js';

// Import helpers after mocking
import {
  triageBadgeClass,
  memoryBadgeClass,
  planBadgeClass,
  enterpriseBadgeClass,
  computeRiskPosture,
  computeReadinessVerdict,
  computePilotExpansionScore,
} from '../public/js/helpers.js';

describe('Badge Class Helpers', () => {
  describe('triageBadgeClass', () => {
    it('returns blue for ACK status', () => {
      expect(triageBadgeClass('ACK')).toBe('bg-blue-100 text-blue-700');
    });

    it('returns amber for IN_REVIEW status', () => {
      expect(triageBadgeClass('IN_REVIEW')).toBe('bg-amber-100 text-amber-700');
    });

    it('returns red for ESCALATED status', () => {
      expect(triageBadgeClass('ESCALATED')).toBe('bg-red-100 text-red-700');
    });

    it('returns green for RESOLVED status', () => {
      expect(triageBadgeClass('RESOLVED')).toBe('bg-green-100 text-green-700');
    });

    it('returns slate for unknown status', () => {
      expect(triageBadgeClass('UNKNOWN')).toBe('bg-slate-100 text-slate-700');
    });
  });

  describe('memoryBadgeClass', () => {
    it('returns green for APPROVED status', () => {
      expect(memoryBadgeClass('APPROVED')).toBe('bg-green-100 text-green-700');
    });

    it('returns red for REJECTED status', () => {
      expect(memoryBadgeClass('REJECTED')).toBe('bg-red-100 text-red-700');
    });

    it('returns amber for CONFLICT_FLAGGED status', () => {
      expect(memoryBadgeClass('CONFLICT_FLAGGED')).toBe('bg-amber-100 text-amber-700');
    });

    it('returns blue for default/pending status', () => {
      expect(memoryBadgeClass('PENDING')).toBe('bg-blue-100 text-blue-700');
    });
  });

  describe('planBadgeClass', () => {
    it('returns green for REVIEWED status', () => {
      expect(planBadgeClass('REVIEWED')).toBe('bg-green-100 text-green-700');
    });

    it('returns amber for HOLD status', () => {
      expect(planBadgeClass('HOLD')).toBe('bg-amber-100 text-amber-700');
    });

    it('returns slate for DRAFT status', () => {
      expect(planBadgeClass('DRAFT')).toBe('bg-slate-100 text-slate-700');
    });
  });

  describe('enterpriseBadgeClass', () => {
    it('returns green for APPROVED status', () => {
      expect(enterpriseBadgeClass('APPROVED')).toBe('bg-green-100 text-green-700');
    });

    it('returns amber for CONDITIONAL status', () => {
      expect(enterpriseBadgeClass('CONDITIONAL')).toBe('bg-amber-100 text-amber-700');
    });

    it('returns red for REVIEW_REQUIRED status', () => {
      expect(enterpriseBadgeClass('REVIEW_REQUIRED')).toBe('bg-red-100 text-red-700');
    });
  });
});

describe('Risk Posture Calculator', () => {
  function createSelectWithValue(id, value) {
    const select = document.createElement('select');
    select.id = id;
    const option = document.createElement('option');
    option.value = value;
    option.selected = true;
    select.appendChild(option);
    document.body.appendChild(select);
    return select;
  }

  beforeEach(() => {
    // Reset mock state
    mockState.triageQueue = [];
    // Remove any existing DOM elements
    document.body.innerHTML = '';
  });

  it('returns Elevated when safety tier is T3', () => {
    createSelectWithValue('safety-tier', 'T3');
    expect(computeRiskPosture()).toBe('Elevated');
  });

  it('returns Elevated when triage has ESCALATED status', () => {
    createSelectWithValue('safety-tier', 'T1');
    mockState.triageQueue = [{ id: '1', status: 'ESCALATED', signalBand: 'MODERATE' }];
    expect(computeRiskPosture()).toBe('Elevated');
  });

  it('returns Elevated when triage has ELEVATED signalBand', () => {
    createSelectWithValue('safety-tier', 'T1');
    mockState.triageQueue = [{ id: '1', status: 'ACK', signalBand: 'ELEVATED' }];
    expect(computeRiskPosture()).toBe('Elevated');
  });

  it('returns Moderate when safety tier is T2 and no escalations', () => {
    createSelectWithValue('safety-tier', 'T2');
    mockState.triageQueue = [{ id: '1', status: 'ACK', signalBand: 'MODERATE' }];
    expect(computeRiskPosture()).toBe('Moderate');
  });

  it('returns Guarded when safety tier is T1 and no escalations', () => {
    createSelectWithValue('safety-tier', 'T1');
    mockState.triageQueue = [];
    expect(computeRiskPosture()).toBe('Guarded');
  });
});

describe('Readiness Verdict Calculator', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('returns APPROVED when signal >= 70', () => {
    const span = document.createElement('span');
    span.id = 'enterprise-readiness-signal';
    span.textContent = '75';
    document.body.appendChild(span);

    expect(computeReadinessVerdict()).toBe('APPROVED');
  });

  it('returns CONDITIONAL when signal >= 40 and < 70', () => {
    const span = document.createElement('span');
    span.id = 'enterprise-readiness-signal';
    span.textContent = '55';
    document.body.appendChild(span);

    expect(computeReadinessVerdict()).toBe('CONDITIONAL');
  });

  it('returns REVIEW_REQUIRED when signal < 40', () => {
    const span = document.createElement('span');
    span.id = 'enterprise-readiness-signal';
    span.textContent = '30';
    document.body.appendChild(span);

    expect(computeReadinessVerdict()).toBe('REVIEW_REQUIRED');
  });

  it('returns REVIEW_REQUIRED when element not found', () => {
    expect(computeReadinessVerdict()).toBe('REVIEW_REQUIRED');
  });
});

describe('Pilot Expansion Score Calculator', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mockState.triageQueue = [];
  });

  it('calculates score based on time saved, readiness, and unresolved items', () => {
    // Set up DOM elements
    const timeEl = document.createElement('span');
    timeEl.id = 'roi-metric-1';
    timeEl.textContent = '5.0';
    document.body.appendChild(timeEl);

    const readinessEl = document.createElement('span');
    readinessEl.id = 'enterprise-readiness-signal';
    readinessEl.textContent = '60';
    document.body.appendChild(readinessEl);

    // Add unresolved ELEVATED items
    mockState.triageQueue = [
      { id: '1', status: 'ACK', signalBand: 'ELEVATED' },
      { id: '2', status: 'RESOLVED', signalBand: 'ELEVATED' },
    ];

    // Score = 5.0 + 60 * 0.2 + 1 * 5 = 5 + 12 + 5 = 22
    expect(computePilotExpansionScore()).toBe(22);
  });

  it('returns 0 when no DOM elements exist', () => {
    mockState.triageQueue = [];
    expect(computePilotExpansionScore()).toBe(0);
  });

  it('correctly counts only unresolved ELEVATED items', () => {
    const timeEl = document.createElement('span');
    timeEl.id = 'roi-metric-1';
    timeEl.textContent = '0';
    document.body.appendChild(timeEl);

    const readinessEl = document.createElement('span');
    readinessEl.id = 'enterprise-readiness-signal';
    readinessEl.textContent = '0';
    document.body.appendChild(readinessEl);

    mockState.triageQueue = [
      { id: '1', status: 'ACK', signalBand: 'ELEVATED' },
      { id: '2', status: 'IN_REVIEW', signalBand: 'ELEVATED' },
      { id: '3', status: 'RESOLVED', signalBand: 'ELEVATED' },
      { id: '4', status: 'ACK', signalBand: 'MODERATE' },
    ];

    // Score = 0 + 0 + 2 * 5 = 10
    expect(computePilotExpansionScore()).toBe(10);
  });
});
