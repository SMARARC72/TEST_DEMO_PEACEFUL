/**
 * Voice Processing Pipeline
 *
 * Handles audio upload, transcription (via Whisper), and submission to
 * the summarisation pipeline.
 *
 * Architecture:
 * 1. Patient records audio in browser (MediaRecorder API → WebM/MP4)
 * 2. Audio uploaded to S3 (encrypted)
 * 3. Whisper transcribes audio → text
 * 4. Text fed to summarisation pipeline
 *
 * Currently stubbed — Whisper integration requires:
 * - OpenAI API key for hosted Whisper, OR
 * - Self-hosted Whisper large-v3 for HIPAA compliance
 */

/** Supported audio container formats */
export type AudioFormat = 'webm' | 'mp4' | 'wav';

/** Input for voice memo processing */
export interface VoiceProcessingInput {
  /** S3 URL of the uploaded audio file */
  audioUrl: string;
  /** Patient identifier */
  patientId: string;
  /** Audio duration in seconds */
  duration: number;
  /** Audio container format */
  format: AudioFormat;
}

/** Output from voice processing / transcription */
export interface VoiceProcessingResult {
  /** The transcribed text */
  transcription: string;
  /** Transcription confidence (0.0–1.0) */
  confidence: number;
  /** Detected language */
  language: string;
  /** Audio duration in seconds */
  duration: number;
  /** Word count of the transcription */
  wordCount: number;
}

/**
 * Process a voice memo through the transcription pipeline.
 *
 * @param input - Audio file metadata and patient context
 * @returns Transcription result (currently stubbed)
 *
 * @remarks
 * This function is a stub. When Whisper is integrated, it will:
 * 1. Download the audio from S3
 * 2. Submit to Whisper ASR (self-hosted for HIPAA compliance)
 * 3. Post-process the transcription (punctuation, speaker diarisation)
 * 4. Return the structured result
 */
export async function processVoiceMemo(
  input: VoiceProcessingInput,
): Promise<VoiceProcessingResult> {
  // TODO: Integrate Whisper API
  // For now, return stub indicating the pipeline structure
  console.log(
    `[voice-pipeline] Processing audio: ${input.audioUrl} (${input.duration}s, ${input.format})`,
  );

  return {
    transcription:
      '[Voice transcription will be processed by Whisper ASR pipeline]',
    confidence: 0,
    language: 'en',
    duration: input.duration,
    wordCount: 0,
  };
}

/**
 * Validate that an audio MIME type is supported.
 *
 * @param format - The MIME type string to validate
 * @returns Whether the format is supported for processing
 */
export function validateAudioFormat(format: string): boolean {
  return ['audio/webm', 'audio/mp4', 'audio/wav', 'audio/mpeg'].includes(
    format,
  );
}

/**
 * Estimate server-side processing time for a given audio duration.
 *
 * @param durationSeconds - Length of the audio in seconds
 * @returns Estimated processing time in milliseconds
 *
 * @remarks
 * Whisper processes roughly 1 minute of audio in ~10 seconds on GPU.
 * This estimate includes a safety margin for network latency and
 * post-processing overhead.
 */
export function estimateProcessingTime(durationSeconds: number): number {
  return Math.ceil(durationSeconds / 6) * 1000;
}
