// ─── Voice Processor Tests ───────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import {
  processVoiceMemo,
  validateAudioFormat,
  estimateProcessingTime,
  type VoiceProcessingInput,
} from '../../processors/voice.js';

const sampleInput: VoiceProcessingInput = {
  audioUrl: 's3://peacefull-uploads/audio/test.webm',
  patientId: 'patient-123',
  duration: 60,
  format: 'webm',
};

describe('processVoiceMemo', () => {
  it('throws an error (UGO-1.2: voice is a documented MVP limitation)', async () => {
    await expect(processVoiceMemo(sampleInput)).rejects.toThrow(
      'Voice transcription not available',
    );
  });

  it('includes Whisper reference in error message', async () => {
    await expect(processVoiceMemo(sampleInput)).rejects.toThrow('Whisper');
  });
});

describe('validateAudioFormat', () => {
  it('accepts audio/webm', () => {
    expect(validateAudioFormat('audio/webm')).toBe(true);
  });

  it('accepts audio/mp4', () => {
    expect(validateAudioFormat('audio/mp4')).toBe(true);
  });

  it('accepts audio/wav', () => {
    expect(validateAudioFormat('audio/wav')).toBe(true);
  });

  it('accepts audio/mpeg', () => {
    expect(validateAudioFormat('audio/mpeg')).toBe(true);
  });

  it('rejects unsupported formats', () => {
    expect(validateAudioFormat('audio/ogg')).toBe(false);
    expect(validateAudioFormat('video/mp4')).toBe(false);
    expect(validateAudioFormat('text/plain')).toBe(false);
    expect(validateAudioFormat('')).toBe(false);
  });
});

describe('estimateProcessingTime', () => {
  it('returns estimated time in milliseconds', () => {
    const result = estimateProcessingTime(60);
    expect(result).toBe(10000); // 60s / 6 = 10 → 10 * 1000 = 10000ms
  });

  it('handles short audio clips', () => {
    const result = estimateProcessingTime(5);
    expect(result).toBe(1000); // ceil(5/6) = 1 → 1000ms
  });

  it('handles zero duration', () => {
    const result = estimateProcessingTime(0);
    expect(result).toBe(0); // ceil(0/6) = 0 → 0ms
  });

  it('handles large durations', () => {
    const result = estimateProcessingTime(3600);
    expect(result).toBe(600000); // 1 hour → 10 min processing
  });
});
