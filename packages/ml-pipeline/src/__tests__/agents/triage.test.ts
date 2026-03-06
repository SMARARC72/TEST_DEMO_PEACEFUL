// ─── Triage Agent Tests ──────────────────────────────────────────────
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { triageSubmission, type TriageInput } from '../../agents/triage.js';

// ── Mock Anthropic SDK ──────────────────────────────────────────────

function createMockClient(responseText: string) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: responseText }],
        model: 'claude-sonnet-4-20250514',
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
    },
  } as any;
}

const baseInput: TriageInput = {
  content: 'I had a really good day today. Went for a walk and felt calm.',
  source: 'JOURNAL',
};

describe('triageSubmission', () => {
  it('parses a valid JSON response into TriageResult', async () => {
    const json = JSON.stringify({
      signalBand: 'LOW',
      riskFactors: [],
      protectiveFactors: ['outdoor activity', 'positive mood'],
      reasoning: 'Patient reports positive experiences with no risk indicators.',
      immediateAction: false,
      escalationRecommended: false,
    });
    const client = createMockClient(json);
    const result = await triageSubmission(client, baseInput);

    expect(result.signalBand).toBe('LOW');
    expect(result.riskFactors).toEqual([]);
    expect(result.protectiveFactors).toContain('outdoor activity');
    expect(result.immediateAction).toBe(false);
    expect(result.escalationRecommended).toBe(false);
    expect(result.model).toBe('claude-sonnet-4-20250514');
    expect(result.usage.inputTokens).toBe(100);
  });

  it('handles JSON wrapped in markdown code blocks', async () => {
    const json = '```json\n' + JSON.stringify({
      signalBand: 'ELEVATED',
      riskFactors: ['suicidal ideation'],
      protectiveFactors: [],
      reasoning: 'Patient expresses desire to end their life.',
      immediateAction: true,
      escalationRecommended: true,
    }) + '\n```';
    const client = createMockClient(json);
    const result = await triageSubmission(client, baseInput);

    expect(result.signalBand).toBe('ELEVATED');
    expect(result.immediateAction).toBe(true);
    expect(result.escalationRecommended).toBe(true);
  });

  it('returns MODERATE fallback when JSON is unparseable', async () => {
    const client = createMockClient('This is just plain text with no JSON at all.');
    const result = await triageSubmission(client, baseInput);

    expect(result.signalBand).toBe('MODERATE');
    expect(result.escalationRecommended).toBe(true);
    expect(result.riskFactors[0]).toContain('manual review required');
  });

  it('returns safe fallback on API error', async () => {
    const client = {
      messages: {
        create: vi.fn().mockRejectedValue(new Error('API rate limit exceeded')),
      },
    } as any;
    const result = await triageSubmission(client, baseInput);

    expect(result.signalBand).toBe('MODERATE');
    expect(result.escalationRecommended).toBe(true);
    expect(result.model).toBe('error-fallback');
    expect(result.riskFactors[0]).toContain('API rate limit exceeded');
  });

  it('passes checkin data through to Claude', async () => {
    const json = JSON.stringify({
      signalBand: 'GUARDED',
      riskFactors: [],
      protectiveFactors: [],
      reasoning: 'Low mood scores.',
      immediateAction: false,
      escalationRecommended: false,
    });
    const client = createMockClient(json);
    await triageSubmission(client, {
      ...baseInput,
      checkinData: { mood: 3, stress: 8, sleep: 4, focus: 5 },
    });

    expect(client.messages.create).toHaveBeenCalledTimes(1);
    const call = client.messages.create.mock.calls[0][0];
    expect(call.messages[0].content).toContain('Mood');
  });
});
