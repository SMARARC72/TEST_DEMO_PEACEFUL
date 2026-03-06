// ─── Summarizer Agent Tests ──────────────────────────────────────────
import { describe, it, expect, vi } from 'vitest';
import { summarizeSubmission, type SummarizationInput } from '../../agents/summarizer.js';

function createMockClient(responseText: string) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: responseText }],
        model: 'claude-sonnet-4-20250514',
        usage: { input_tokens: 200, output_tokens: 150 },
      }),
    },
  } as any;
}

const baseInput: SummarizationInput = {
  content: 'Today I felt anxious at work but managed it with breathing exercises.',
  source: 'JOURNAL',
};

describe('summarizeSubmission', () => {
  it('parses valid JSON into SummarizationResult', async () => {
    const json = JSON.stringify({
      signalBand: 'GUARDED',
      summary: 'Patient reports work-related anxiety managed with coping strategies.',
      evidence: ['anxiety at work', 'breathing exercises used'],
      unknowns: [],
      tone: 'cautiously optimistic',
      nextStep: 'Explore work triggers in next session.',
    });
    const client = createMockClient(json);
    const result = await summarizeSubmission(client, baseInput);

    expect(result.signalBand).toBe('GUARDED');
    expect(result.summary).toContain('work-related anxiety');
    expect(result.evidence).toHaveLength(2);
    expect(result.tone).toBe('cautiously optimistic');
    expect(result.model).toBe('claude-sonnet-4-20250514');
  });

  it('returns fallback when JSON cannot be parsed', async () => {
    const client = createMockClient('No structured output here.');
    const result = await summarizeSubmission(client, baseInput);

    expect(result.signalBand).toBe('GUARDED');
    expect(result.summary).toContain('manual clinician review');
  });

  it('returns error fallback on API failure', async () => {
    const client = {
      messages: {
        create: vi.fn().mockRejectedValue(new Error('Timeout')),
      },
    } as any;
    const result = await summarizeSubmission(client, baseInput);

    expect(result.signalBand).toBe('GUARDED');
    expect(result.summary).toContain('Timeout');
    expect(result.model).toBe('error-fallback');
  });

  it('handles partial JSON with missing fields', async () => {
    const json = JSON.stringify({
      signalBand: 'LOW',
      summary: 'Brief entry.',
    });
    const client = createMockClient(json);
    const result = await summarizeSubmission(client, baseInput);

    expect(result.signalBand).toBe('LOW');
    expect(result.evidence).toEqual([]);
    expect(result.unknowns).toEqual([]);
    expect(result.tone).toBe('undetermined');
  });
});
