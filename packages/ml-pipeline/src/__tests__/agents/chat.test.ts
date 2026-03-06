// ─── Chat Companion Agent Tests ──────────────────────────────────────
import { describe, it, expect, vi } from 'vitest';
import { chatCompanionTurn, chatCompanionStream, type ChatInput } from '../../agents/chat.js';

function createMockClient(responseText: string) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: responseText }],
        model: 'claude-sonnet-4-20250514',
        usage: { input_tokens: 80, output_tokens: 60 },
      }),
      stream: vi.fn().mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello ' } };
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'there!' } };
        },
        finalMessage: vi.fn().mockResolvedValue({
          model: 'claude-sonnet-4-20250514',
          usage: { input_tokens: 80, output_tokens: 30 },
        }),
      }),
    },
  } as any;
}

const baseInput: ChatInput = {
  message: 'I had a tough day at work.',
  history: [],
};

describe('chatCompanionTurn', () => {
  it('returns a response with safety metadata', async () => {
    const client = createMockClient('That sounds challenging. Would you like to talk about what happened?');
    const result = await chatCompanionTurn(client, baseInput);

    expect(result.response).toContain('challenging');
    expect(result.safetyFlag).toBe(false);
    expect(result.detectedSignalBand).toBe('LOW');
    expect(result.safetyTriggers).toEqual([]);
    expect(result.model).toBe('claude-sonnet-4-20250514');
  });

  it('detects ELEVATED safety triggers', async () => {
    const client = createMockClient('I hear you. Please know you are not alone.');
    const result = await chatCompanionTurn(client, {
      ...baseInput,
      message: 'I want to kill myself, I cannot go on.',
    });

    expect(result.safetyFlag).toBe(true);
    expect(result.detectedSignalBand).toBe('ELEVATED');
    expect(result.safetyTriggers).toContain('kill myself');
  });

  it('detects MODERATE concern phrases', async () => {
    const client = createMockClient('It sounds like things are difficult.');
    const result = await chatCompanionTurn(client, {
      ...baseInput,
      message: 'I feel hopeless and worthless.',
    });

    expect(result.safetyFlag).toBe(true);
    expect(result.detectedSignalBand).toBe('MODERATE');
    expect(result.safetyTriggers).toContain('hopeless');
  });

  it('returns fallback response on API error', async () => {
    const client = {
      messages: {
        create: vi.fn().mockRejectedValue(new Error('Network error')),
      },
    } as any;
    const result = await chatCompanionTurn(client, baseInput);

    expect(result.response).toContain('988');
    expect(result.model).toBe('error-fallback');
  });

  it('includes memory context in system prompt', async () => {
    const client = createMockClient('Keep up the great work with meditation!');
    await chatCompanionTurn(client, {
      ...baseInput,
      memoryItems: [{ category: 'COPING_STRATEGY', statement: 'meditation helps' }],
      patientName: 'Alex',
    });

    const call = client.messages.create.mock.calls[0][0];
    expect(call.system).toContain('Alex');
    expect(call.system).toContain('meditation helps');
  });
});

describe('chatCompanionStream', () => {
  it('yields text chunks and returns final result', async () => {
    const client = createMockClient('');
    const gen = chatCompanionStream(client, baseInput);

    const chunks: string[] = [];
    let result: any;
    while (true) {
      const { value, done } = await gen.next();
      if (done) {
        result = value;
        break;
      }
      chunks.push(value as string);
    }

    expect(chunks).toEqual(['Hello ', 'there!']);
    expect(result.response).toBe('Hello there!');
    expect(result.safetyFlag).toBe(false);
  });
});
