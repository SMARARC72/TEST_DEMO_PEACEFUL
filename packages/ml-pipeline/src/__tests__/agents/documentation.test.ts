// ─── Documentation (SOAP Note) Agent Tests ──────────────────────────
import { describe, it, expect, vi } from 'vitest';
import { generateSOAPNote, type DocumentationInput } from '../../agents/documentation.js';

function createMockClient(responseText: string) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: responseText }],
        model: 'claude-sonnet-4-20250514',
        usage: { input_tokens: 400, output_tokens: 600 },
      }),
    },
  } as any;
}

const baseInput: DocumentationInput = {
  sessionData: 'Patient discussed work stressors and practiced CBT techniques for catastrophizing.',
};

describe('generateSOAPNote', () => {
  it('parses valid SOAP note response', async () => {
    const json = JSON.stringify({
      subjective: 'Patient reports ongoing work stress and difficulty managing catastrophic thoughts.',
      objective: 'Patient engaged in CBT exercises. Mood ratings stable.',
      assessment: 'Moderate progress with cognitive restructuring techniques.',
      plan: 'Continue CBT homework. Review thought record at next session.',
    });
    const client = createMockClient(json);
    const result = await generateSOAPNote(client, baseInput);

    expect(result.success).toBe(true);
    expect(result.note.subjective).toContain('work stress');
    expect(result.note.objective).toContain('CBT');
    expect(result.draftLabel).toContain('DRAFT');
    expect(result.draftLabel).toContain('clinician review');
  });

  it('returns fallback when JSON cannot be parsed', async () => {
    const client = createMockClient('The session went well overall.');
    const result = await generateSOAPNote(client, baseInput);

    expect(result.success).toBe(false);
    expect(result.draftLabel).toContain('DRAFT');
  });

  it('returns error fallback on API failure', async () => {
    const client = {
      messages: {
        create: vi.fn().mockRejectedValue(new Error('Token limit')),
      },
    } as any;
    const result = await generateSOAPNote(client, baseInput);

    expect(result.success).toBe(false);
    expect(result.model).toBe('error-fallback');
    expect(result.draftLabel).toContain('DRAFT');
  });

  it('ensures DRAFT label is present in all SOAP sections', async () => {
    const json = JSON.stringify({
      subjective: 'Patient reports...',
      objective: 'Observed...',
      assessment: 'Assessment...',
      plan: 'Plan...',
    });
    const client = createMockClient(json);
    const result = await generateSOAPNote(client, baseInput);

    // The agent should prepend DRAFT labels to each section
    expect(result.note.subjective).toContain('DRAFT');
    expect(result.note.objective).toContain('DRAFT');
    expect(result.note.assessment).toContain('DRAFT');
    expect(result.note.plan).toContain('DRAFT');
  });
});
