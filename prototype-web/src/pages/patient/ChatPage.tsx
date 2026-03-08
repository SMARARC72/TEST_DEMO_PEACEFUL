// ─── Chat Page ───────────────────────────────────────────────────────
// AI companion with SSE streaming. Provides between-session conversational
// support using therapeutic techniques (CBT, motivational interviewing).

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import { patientApi } from '@/api/patients';
import { VoiceInput } from '@/components/domain/VoiceInput';
import { useFeatureFlag } from '@/lib/featureFlags';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

/** Parse a single SSE line into structured data */
function parseSSELine(line: string): { sessionId?: string; content?: string; done?: boolean } | null {
  if (!line.startsWith('data: ')) return null;
  const data = line.slice(6);
  if (data === '[DONE]') return { done: true };
  try {
    const parsed = JSON.parse(data);
    return {
      sessionId: parsed.sessionId,
      content: parsed.content || parsed.output?.content,
    };
  } catch {
    return { content: data };
  }
}

const FALLBACK_RESPONSES = [
  "I hear you, and I appreciate you sharing that with me. Let's take a moment to reflect on what you're feeling. What do you think is the strongest emotion right now?",
  "Thank you for opening up. It takes courage to express your thoughts. Can you tell me more about what's been on your mind?",
  "That's a really thoughtful observation. Between sessions, it can help to notice patterns in how we're feeling. Would you like to explore that further?",
  "I'm glad you reached out. Remember, every step — even a small one — counts. What's one thing that helped you feel better recently?",
];

/** Contextual AI responses that reference user input — used in demo/mock mode */
function getDemoResponse(userMessage: string): string {
  const snippet = userMessage.slice(0, 60);
  const contextual = [
    `I hear you, and I appreciate you sharing that. You mentioned "${snippet}" — let's unpack that together. What feels most important about this right now?`,
    `Thank you for opening up about that. When you say "${snippet}", I notice there might be some strong feelings there. Can you tell me more about what's behind those words?`,
    `That's a really thoughtful observation. You brought up "${snippet}" — between sessions, it can help to notice patterns in how we're feeling. Would you like to explore that further?`,
    `I'm glad you reached out. You mentioned "${snippet}". Remember, every step — even a small one — counts. What's one thing that's helped you feel better recently?`,
    `I understand. "${snippet}" is something worth exploring together. Let's take a moment to reflect — what do you think is the strongest emotion right now?`,
  ];
  return contextual[Math.floor(Math.random() * contextual.length)] ?? contextual[0] ?? '';
}

function getRandomFallback(): string {
  return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)] ?? FALLBACK_RESPONSES[0] ?? '';
}

/** Whether we're running in demo/mock mode (MSW active) */
const IS_DEMO_MODE = import.meta.env.VITE_ENABLE_MOCKS === 'true' || import.meta.env.VITE_ENV === 'demo';

/** Simulate word-by-word streaming in demo mode (bypasses MSW service worker SSE issues) */
async function simulateDemoStream(
  userMessage: string,
  assistantId: string,
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setSessionId: React.Dispatch<React.SetStateAction<string | null>>,
  signal: AbortSignal,
): Promise<void> {
  const reply = getDemoResponse(userMessage);
  const words = reply.split(' ');
  const mockSid = `session-${Date.now()}`;
  setSessionId((prev) => prev ?? mockSid);

  let accumulated = '';
  for (let i = 0; i < words.length; i++) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    const word = (words[i] ?? '') + (i < words.length - 1 ? ' ' : '');
    accumulated += word;
    const snapshot = accumulated;
    setMessages((prev) =>
      prev.map((m) => (m.id === assistantId ? { ...m, content: snapshot } : m)),
    );
    await new Promise((r) => setTimeout(r, 40 + Math.random() * 30));
  }
}

export default function ChatPage() {
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'system-1',
      role: 'system',
      content:
        "Hi! I'm your Peacefull companion. I'm here to support you between sessions. Remember, I'm an AI assistant — for emergencies, please call 988 or 911.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const [resolvedPatientId, setResolvedPatientId] = useState<string | null>(null);
  const showVoice = useFeatureFlag('voiceInput');

  // Resolve the actual Patient-table ID (backend AI route needs patient.id, not user.id)
  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const [patient] = await patientApi.getPatient(userId);
      if (!cancelled && patient) {
        setResolvedPatientId(patient.id);
      } else if (!cancelled) {
        // Fallback: use user.id directly (works if backend has resolvePatientForAI)
        setResolvedPatientId(userId);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function handleSend() {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);

    // Create placeholder for assistant response
    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', timestamp: new Date().toISOString() },
    ]);

    // Auto-timeout after 30 seconds to prevent hanging connections
    const CHAT_TIMEOUT_MS = 30_000;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      abortControllerRef.current = new AbortController();

      timeoutId = setTimeout(() => {
        abortControllerRef.current?.abort();
      }, CHAT_TIMEOUT_MS);

      // ─── Demo mode: simulate streaming locally (avoids MSW service-worker SSE issues) ───
      if (IS_DEMO_MODE) {
        await simulateDemoStream(text, assistantId, setMessages, setSessionId, abortControllerRef.current.signal);
        return; // finally block still runs
      }

      // ─── Production: real SSE streaming to backend AI ───
      const apiUrl = import.meta.env.VITE_API_URL || '/api/v1';
      const token = useAuthStore.getState().accessToken;
      const patientId = resolvedPatientId ?? user?.id ?? '';

      // Build message history in backend-expected format (exclude system messages)
      // Use messagesRef.current to capture the latest state including the just-added user message
      const conversationMessages = messagesRef.current
        .filter((m) => m.role !== 'system')
        .slice(-20)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      // Read CSRF token from cookie for cookie-auth mode
      const csrfMatch = document.cookie.match(/(?:^|;\s*)pf_csrf_token=([^;]*)/);
      const csrfToken = csrfMatch?.[1] ? decodeURIComponent(csrfMatch[1]) : null;

      const response = await fetch(`${apiUrl}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          patientId,
          messages: conversationMessages,
          ...(sessionId ? { sessionId } : {}),
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error(`Chat API error: ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let accumulated = '';
      let streamDone = false;

      const appendContent = (content: string) => {
        accumulated += content;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m)),
        );
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const parsed = parseSSELine(line);
          if (!parsed) continue;
          if (parsed.done) {
            streamDone = true;
            break;
          }
          if (parsed.sessionId && !sessionId) {
            setSessionId(parsed.sessionId);
          }
          if (parsed.content) {
            appendContent(parsed.content);
          }
        }

        if (streamDone) break;
      }

      // In demo mode we can synthesize a reply; in production an empty stream is an error.
      if (!accumulated.trim()) {
        if (IS_DEMO_MODE) {
          const fallback = getDemoResponse(text);
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: fallback } : m)),
          );
        } else {
          throw new Error('The AI companion did not return a response.');
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        if (IS_DEMO_MODE) {
          const fallback = getRandomFallback();
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: fallback } : m,
            ),
          );
          addToast({ title: 'Using offline mode — responses are pre-generated', variant: 'info' });
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content:
                      "I'm having trouble reaching the Peacefull service right now. Please try again in a moment. If you need immediate support, contact your care team or call 988.",
                  }
                : m,
            ),
          );
          addToast({
            title: 'AI companion unavailable',
            description: (err as Error).message,
            variant: 'error',
          });
        }
      } else {
        // Timed out or user stopped — show a timeout-specific fallback
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId && m.content === ''
              ? { ...m, content: "I'm having trouble connecting right now. Please try again in a moment, or reach out to your care team if you need support." }
              : m,
          ),
        );
        addToast({ title: 'Connection timed out — please try again', variant: 'warning' });
      }
    } finally {
      clearTimeout(timeoutId);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleStop() {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }

  const firstName = user?.profile?.firstName ?? 'there';

  return (
    <div className="flex h-full flex-col" role="main" aria-label="AI Companion chat">
      {/* Crisis safety disclaimer — non-dismissible */}
      <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-center text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300" role="alert">
        <strong>⚠ This AI companion is not a crisis service.</strong> If you are in danger, call{' '}
        <a href="tel:988" className="font-bold underline">988</a> (Suicide &amp; Crisis Lifeline) or{' '}
        <a href="tel:911" className="font-bold underline">911</a> immediately.
      </div>

      {/* Header */}
      <div className="border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-700 dark:bg-neutral-800">
        <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
          AI Companion
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Between-session support • Not a substitute for professional care
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-brand-600 text-white'
                    : msg.role === 'system'
                      ? 'border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200'
                      : 'border border-neutral-200 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100'
                }`}
              >
                {msg.role === 'system' && (
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                    ⚠ Important Notice
                  </div>
                )}
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {msg.content}
                  {msg.id.startsWith('assistant-') && isStreaming && msg.content === '' && (
                    <span className="inline-block animate-pulse">●●●</span>
                  )}
                </p>
                <time className="mt-1 block text-xs opacity-50">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Crisis banner */}
      <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-center text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
        If you're in crisis, call <strong>988</strong> (Suicide & Crisis Lifeline) or{' '}
        <strong>911</strong> for emergencies
      </div>

      {/* Input */}
      <div className="border-t border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
        <div className="mx-auto flex max-w-2xl gap-3">
          {showVoice && (
            <VoiceInput
              onTranscript={(text) => setInput((prev) => prev + (prev ? ' ' : '') + text)}
              label=""
              disabled={isStreaming}
              className="flex-shrink-0"
            />
          )}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={`Hi ${firstName}, what's on your mind?`}
            aria-label="Type your message"
            className="flex-1 resize-none rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white dark:placeholder-neutral-500"
          />
          {isStreaming ? (
            <button
              onClick={handleStop}
              className="flex-shrink-0 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="flex-shrink-0 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
