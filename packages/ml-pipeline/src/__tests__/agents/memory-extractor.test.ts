// ─── Memory Extractor Agent Tests ────────────────────────────────────
import { describe, it, expect, vi } from 'vitest';
import { extractMemories, type MemoryExtractionInput } from '../../agents/memory-extractor.js';

function createMockClient(responseText: string) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: responseText }],
        model: 'claude-sonnet-4-20250514',
        usage: { input_tokens: 150, output_tokens: 120 },
      }),
    },
  } as any;
}

const baseInput: MemoryExtractionInput = {
  content: 'I discovered that walking in nature really helps my anxiety. My sister visited last weekend.',
  source: 'JOURNAL',
};

describe('extractMemories', () => {
  it('extracts valid memory proposals from JSON array response', async () => {
    const json = JSON.stringify([
      {
        category: 'COPING_STRATEGY',
        statement: 'Walking in nature helps with anxiety',
        confidence: 0.9,
        conflict: false,
        existing: null,
        uncertainty: null,
        evidence: ['walking in nature really helps my anxiety'],
      },
      {
        category: 'LIFE_EVENT',
        statement: 'Sister visited recently',
        confidence: 0.7,
        conflict: false,
        existing: null,
        uncertainty: 'May be a routine visit, not clinically significant',
        evidence: ['My sister visited last weekend'],
      },
    ]);
    const client = createMockClient(json);
    const result = await extractMemories(client, baseInput);

    expect(result.success).toBe(true);
    expect(result.proposals).toHaveLength(2);
    expect(result.proposals[0].category).toBe('COPING_STRATEGY');
    expect(result.proposals[0].confidence).toBe(0.9);
    expect(result.proposals[1].category).toBe('LIFE_EVENT');
  });

  it('returns empty proposals when no JSON array found (routine submission)', async () => {
    const client = createMockClient('No significant memories to extract from this routine check-in.');
    const result = await extractMemories(client, baseInput);

    expect(result.success).toBe(true);
    expect(result.proposals).toEqual([]);
  });

  it('caps proposals at 5 even if Claude over-extracts', async () => {
    const proposals = Array.from({ length: 8 }, (_, i) => ({
      category: 'INSIGHT',
      statement: `Insight ${i}`,
      confidence: 0.8,
      conflict: false,
      existing: null,
      uncertainty: null,
      evidence: [`evidence ${i}`],
    }));
    const client = createMockClient(JSON.stringify(proposals));
    const result = await extractMemories(client, baseInput);

    expect(result.proposals.length).toBeLessThanOrEqual(5);
  });

  it('returns error fallback on API failure', async () => {
    const client = {
      messages: {
        create: vi.fn().mockRejectedValue(new Error('Quota exceeded')),
      },
    } as any;
    const result = await extractMemories(client, baseInput);

    expect(result.success).toBe(false);
    expect(result.proposals).toEqual([]);
    expect(result.model).toBe('error-fallback');
  });
});
