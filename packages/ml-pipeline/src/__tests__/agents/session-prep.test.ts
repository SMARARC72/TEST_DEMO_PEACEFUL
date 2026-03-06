// ─── Session Prep Agent Tests ────────────────────────────────────────
import { describe, it, expect, vi } from 'vitest';
import { generateSessionPrep, type SessionPrepInput } from '../../agents/session-prep.js';

function createMockClient(responseText: string) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: responseText }],
        model: 'claude-sonnet-4-20250514',
        usage: { input_tokens: 300, output_tokens: 400 },
      }),
    },
  } as any;
}

const baseInput: SessionPrepInput = {
  patientId: 'patient-123',
  recentSubmissions: 'Patient reported improved sleep and reduced anxiety over the past week.',
  treatmentGoals: ['Improve sleep hygiene', 'Reduce work anxiety'],
};

describe('generateSessionPrep', () => {
  it('parses a valid JSON response', async () => {
    const json = JSON.stringify({
      suggestedTopics: ['Sleep improvement progress', 'Work anxiety coping'],
      observations: ['Positive sleep trend'],
      questionsForExploration: ['What specific strategies helped with sleep?'],
      goalProgress: [
        { goal: 'Improve sleep hygiene', status: 'ON_TRACK', notes: 'Reported better sleep' },
      ],
      moodTrend: 'Improving over the past week',
    });
    const client = createMockClient(json);
    const result = await generateSessionPrep(client, baseInput);

    expect(result.suggestedTopics).toContain('Sleep improvement progress');
    expect(result.goalProgress).toHaveLength(1);
    expect(result.goalProgress[0].status).toBe('ON_TRACK');
    expect(result.moodTrend).toContain('Improving');
  });

  it('returns fallback when JSON cannot be parsed', async () => {
    const client = createMockClient('Prepare by reviewing the patient chart.');
    const result = await generateSessionPrep(client, baseInput);

    expect(result.suggestedTopics.length).toBeGreaterThanOrEqual(1);
    expect(result.moodTrend).toContain('Unable to assess');
  });

  it('handles missing goalProgress gracefully', async () => {
    const json = JSON.stringify({
      suggestedTopics: ['Topic A'],
      observations: [],
      questionsForExploration: [],
    });
    const client = createMockClient(json);
    const result = await generateSessionPrep(client, baseInput);

    expect(result.goalProgress).toEqual([]);
  });

  it('returns error fallback on API failure', async () => {
    const client = {
      messages: {
        create: vi.fn().mockRejectedValue(new Error('Service unavailable')),
      },
    } as any;
    const result = await generateSessionPrep(client, baseInput);

    expect(result.observations[0]).toContain('Service unavailable');
    expect(result.model).toBe('error-fallback');
  });
});
