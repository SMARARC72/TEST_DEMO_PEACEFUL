// ─── Voice Memo Page (M-08 + M-09) ──────────────────────────────────
// Voice recording UI with privacy notice, upload progress states, and
// history of previous memos. Combined M-08 (recorder) + M-09 (upload).

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth';
import { patientApi } from '@/api/patients';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { useUIStore } from '@/stores/ui';
import { transcribeAudio, initWhisper, isWhisperReady, type TranscriptionProgress } from '@/services/whisper';
import type { VoiceMemo, VoiceMemoStatus } from '@/api/types';

const STATUS_LABELS: Record<VoiceMemoStatus, string> = {
  UPLOADING: 'Uploading…',
  PROCESSING: 'Processing…',
  COMPLETE: 'Complete',
  FAILED: 'Failed',
};

const STATUS_VARIANTS: Record<VoiceMemoStatus, 'info' | 'warning' | 'success' | 'danger'> = {
  UPLOADING: 'info',
  PROCESSING: 'warning',
  COMPLETE: 'success',
  FAILED: 'danger',
};

export default function VoiceMemoPage() {
  const user = useAuthStore((s) => s.user);
  const patientId = user?.id ?? '';
  const addToast = useUIStore((s) => s.addToast);

  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [memos, setMemos] = useState<VoiceMemo[]>([]);
  const [loading, setLoading] = useState(true);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [whisperProgress, setWhisperProgress] = useState<TranscriptionProgress | null>(null);
  const [whisperReady, setWhisperReady] = useState(isWhisperReady());

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pre-warm Whisper model download in background
  useEffect(() => {
    initWhisper((progress) => {
      setWhisperProgress(progress);
      if (progress.status === 'complete' || (progress.status === 'loading' && progress.progress === 100)) {
        setWhisperReady(true);
      }
    }).catch(() => {
      // Whisper init failed — will fall back to Web Speech API
    });
  }, []);

  // Load existing voice memos
  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    (async () => {
      try {
        const [data, err] = await patientApi.getVoiceMemos(patientId);
        if (!cancelled && err) addToast({ title: 'Failed to load voice memos', variant: 'error' });
        if (!cancelled && data) setMemos(data);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [patientId, addToast]);

  // Recording timer
  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recording]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setRecording(true);
      setElapsed(0);
      setAudioBlob(null);
      setTranscription(null);
    } catch {
      addToast({ variant: 'error', title: 'Microphone access denied. Please allow microphone access in your browser settings.' });
    }
  }, [addToast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }, []);

  // Whisper AI transcription
  const handleTranscribe = useCallback(async () => {
    if (!audioBlob || transcribing) return;
    setTranscribing(true);
    setTranscription(null);
    try {
      const text = await transcribeAudio(audioBlob, (progress) => {
        setWhisperProgress(progress);
        if (progress.text) {
          setTranscription(progress.text);
        }
      });
      setTranscription(text);
      addToast({ variant: 'success', title: 'Transcription complete!' });
    } catch (err) {
      addToast({
        variant: 'error',
        title: 'Transcription failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setTranscribing(false);
    }
  }, [audioBlob, transcribing, addToast]);

  const uploadMemo = useCallback(async () => {
    if (!audioBlob || uploading) return;
    setUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress((p) => Math.min(p + 15, 90));
    }, 300);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, `memo-${Date.now()}.webm`);

      const [memo] = await patientApi.uploadVoiceMemo(patientId, formData);
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (memo) {
        setMemos((prev) => [memo, ...prev]);
      }

      addToast({ variant: 'success', title: 'Voice memo uploaded successfully.' });
      setAudioBlob(null);
    } catch {
      clearInterval(progressInterval);
      addToast({ variant: 'error', title: 'Upload failed. Please try again.' });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [audioBlob, uploading, patientId, addToast]);

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Voice Memos</h1>
        <p className="mt-1 text-sm text-slate-600">
          Record a voice memo to share with your clinician
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Badge variant={whisperReady ? 'success' : 'info'}>
            {whisperReady ? '✓ Whisper AI Ready' : '⏳ Loading Whisper AI…'}
          </Badge>
          <span className="text-xs text-slate-400">Powered by OpenAI Whisper</span>
        </div>
      </div>

      {/* Privacy Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <p className="text-sm text-amber-800">
            <strong>Privacy Notice:</strong> Voice recordings are encrypted in transit and at rest.
            Your clinician will only see a draft transcription, which is clearly labeled as
            AI-generated and must be clinician-reviewed. You can delete recordings anytime.
          </p>
        </CardContent>
      </Card>

      {/* Recorder */}
      <Card>
        <CardHeader>
          <CardTitle>Record</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 py-8">
          {/* Waveform visualization placeholder */}
          <div className="flex h-20 w-full max-w-sm items-center justify-center rounded-lg bg-slate-100">
            {recording ? (
              <div className="flex items-center gap-1">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 rounded-full bg-brand-500"
                    style={{
                      height: `${20 + Math.random() * 40}px`,
                      animation: `pulse ${0.5 + Math.random() * 0.5}s ease-in-out infinite alternate`,
                    }}
                  />
                ))}
              </div>
            ) : (
              <span className="text-sm text-slate-400">
                {audioBlob ? '✓ Recording ready' : 'Tap to start recording'}
              </span>
            )}
          </div>

          {/* Timer */}
          <span className="font-mono text-3xl text-slate-700">{formatTime(elapsed)}</span>

          {/* Controls */}
          <div className="flex flex-wrap gap-4 justify-center">
            {!recording ? (
              <Button
                onClick={startRecording}
                disabled={uploading || transcribing}
                size="lg"
                className="rounded-full"
              >
                <span aria-hidden="true">🎙️</span> Start Recording
              </Button>
            ) : (
              <Button
                onClick={stopRecording}
                variant="danger"
                size="lg"
                className="rounded-full"
              >
                <span aria-hidden="true">⏹️</span> Stop
              </Button>
            )}

            {audioBlob && !recording && (
              <>
                <Button
                  onClick={handleTranscribe}
                  disabled={transcribing || uploading}
                  size="lg"
                  variant="secondary"
                >
                  {transcribing ? 'Transcribing…' : '🤖 Transcribe (Whisper AI)'}
                </Button>
                <Button onClick={uploadMemo} disabled={uploading || transcribing} size="lg">
                  {uploading ? 'Uploading…' : '📤 Upload'}
                </Button>
              </>
            )}
          </div>

          {/* Whisper model loading status */}
          {!whisperReady && whisperProgress?.status === 'loading' && (
            <div className="w-full max-w-sm text-center">
              <p className="text-xs text-slate-500">
                Downloading Whisper AI model… {whisperProgress.progress ?? 0}%
              </p>
              <div className="mt-1 h-1.5 w-full rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${whisperProgress.progress ?? 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Transcription result */}
          {transcription && (
            <div className="w-full max-w-sm rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="mb-1 text-xs font-semibold text-blue-700">
                AI Transcription (Whisper)
              </p>
              <p className="text-sm text-slate-700 italic">"{transcription}"</p>
              <p className="mt-1 text-[10px] text-slate-400">
                AI-generated draft — clinician will review before clinical use
              </p>
            </div>
          )}

          {/* Upload progress */}
          {uploading && (
            <div className="w-full max-w-sm">
              <div className="mb-1 flex justify-between text-sm text-slate-600">
                <span>Uploading</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Memo history */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-700">Previous Memos</h2>
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Spinner />
          </div>
        ) : memos.length === 0 ? (
          <p className="text-sm text-slate-500">No voice memos yet. Record your first one above!</p>
        ) : (
          <div className="space-y-3">
            {memos.map((memo) => (
              <Card key={memo.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {new Date(memo.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="text-xs text-slate-500">
                      Duration: {formatTime(memo.duration)}
                    </p>
                    {memo.transcription && (
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500 italic">
                        "{memo.transcription}"
                      </p>
                    )}
                  </div>
                  <Badge variant={STATUS_VARIANTS[memo.status]}>
                    {STATUS_LABELS[memo.status]}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
