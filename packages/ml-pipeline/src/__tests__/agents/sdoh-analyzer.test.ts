// ─── SDOH Analyzer Agent Tests ───────────────────────────────────────
import { describe, it, expect, vi } from 'vitest';
import { analyzeSDOH, type SDOHAnalysisInput } from '../../agents/sdoh-analyzer.js';

function createMockClient(responseText: string) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: responseText }],
        model: 'claude-sonnet-4-20250514',
        usage: { input_tokens: 250, output_tokens: 300 },
      }),
    },
  } as any;
}

const baseInput: SDOHAnalysisInput = {
  content: 'I have stable housing but sometimes skip meals due to budget constraints. I rely on public transit.',
};

describe('analyzeSDOH', () => {
  it('parses valid SDOH analysis response', async () => {
    const json = JSON.stringify({
      domains: {
        housing: { status: 'STABLE', notes: 'Patient reports stable housing.' },
        food: { status: 'LOW_SECURITY', notes: 'Skips meals due to budget.' },
        transportation: { status: 'LIMITED', notes: 'Relies on public transit.' },
        employment: { status: 'EMPLOYED', notes: 'Currently employed.' },
        socialSupport: { status: 'MODERATE', notes: 'Some support system.' },
        education: { status: 'ADEQUATE', notes: 'No barriers reported.' },
      },
      overallRisk: 'MODERATE',
      recommendations: ['Food bank referral', 'Transit assistance program'],
      screeningGaps: ['Employment stability unclear'],
    });
    const client = createMockClient(json);
    const result = await analyzeSDOH(client, baseInput);

    expect(result.overallRisk).toBe('MODERATE');
    expect(result.domains.housing.status).toBe('STABLE');
    expect(result.domains.food.status).toBe('LOW_SECURITY');
    expect(result.recommendations).toHaveLength(2);
  });

  it('returns fallback when JSON cannot be parsed', async () => {
    const client = createMockClient('The patient has some SDOH concerns.');
    const result = await analyzeSDOH(client, baseInput);

    expect(result.overallRisk).toBe('MODERATE');
    expect(result.screeningGaps.length).toBeGreaterThan(0);
  });

  it('returns error fallback on API failure', async () => {
    const client = {
      messages: {
        create: vi.fn().mockRejectedValue(new Error('Connection reset')),
      },
    } as any;
    const result = await analyzeSDOH(client, baseInput);

    expect(result.model).toBe('error-fallback');
    expect(result.overallRisk).toBe('MODERATE');
  });

  it('handles minimal/partial domain data', async () => {
    const json = JSON.stringify({
      domains: {
        housing: { status: 'STABLE', notes: 'OK' },
      },
      overallRisk: 'LOW',
      recommendations: [],
      screeningGaps: [],
    });
    const client = createMockClient(json);
    const result = await analyzeSDOH(client, baseInput);

    expect(result.overallRisk).toBe('LOW');
    // Missing domains should be filled with defaults
    expect(result.domains.food).toBeDefined();
  });
});
