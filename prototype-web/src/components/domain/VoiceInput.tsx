// ─── Voice Input ─────────────────────────────────────────────────────
// Speech-to-text component using the Web Speech API.
// Falls back gracefully when browser doesn't support SpeechRecognition.

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface VoiceInputProps {
  /** Called when final transcript text is available */
  onTranscript: (text: string) => void;
  /** Optional className for the wrapper */
  className?: string;
  /** Button label when idle */
  label?: string;
  /** Whether the component is disabled */
  disabled?: boolean;
}

// Check browser support
const SpeechRecognition =
  typeof window !== 'undefined'
    ? (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition; webkitSpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition
    : undefined;

export function VoiceInput({
  onTranscript,
  className = '',
  label = 'Voice Input',
  disabled = false,
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [supported] = useState(() => !!SpeechRecognition);
  const recognitionRef = useRef<InstanceType<typeof window.SpeechRecognition> | null>(null);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimText('');
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (finalTranscript) {
        onTranscript(finalTranscript);
        setInterimText('');
      } else {
        setInterimText(interim);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn('Speech recognition error:', event.error);
      setIsListening(false);
      setInterimText('');
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText('');
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [onTranscript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  if (!supported) {
    return null; // Don't render if browser doesn't support speech recognition
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <Button
        type="button"
        variant={isListening ? 'danger' : 'secondary'}
        size="sm"
        onClick={isListening ? stopListening : startListening}
        disabled={disabled}
        aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
        className="flex items-center gap-1.5"
      >
        {isListening ? (
          <>
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
            </span>
            Listening…
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 15a3 3 0 003-3V5a3 3 0 00-6 0v7a3 3 0 003 3z"
              />
            </svg>
            {label}
          </>
        )}
      </Button>

      {interimText && (
        <span className="max-w-[200px] truncate text-xs italic text-neutral-400">
          {interimText}
        </span>
      )}
    </div>
  );
}
