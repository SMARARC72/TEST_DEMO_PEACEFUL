// ─── Chat Page ───────────────────────────────────────────────────────
// AI companion with SSE streaming. Provides between-session conversational
// support using therapeutic techniques (CBT, motivational interviewing).

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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

    try {
      abortControllerRef.current = new AbortController();

      const apiUrl = import.meta.env.VITE_API_URL || '/api/v1';
      const token = useAuthStore.getState().accessToken;

      const response = await fetch(`${apiUrl}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          conversationHistory: messages
            .filter((m) => m.role !== 'system')
            .slice(-10)
            .map((m) => ({ role: m.role, content: m.content })),
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
          if (!line.startsWith('data: ')) continue;

          const data = line.slice(6);
          if (data === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              appendContent(parsed.content);
            }
          } catch {
            appendContent(data);
          }
        }

        if (streamDone) break;
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        // Fallback: provide a canned supportive response when API is unavailable
        const fallbackResponses = [
          "I hear you, and I appreciate you sharing that with me. Let's take a moment to reflect on what you're feeling. What do you think is the strongest emotion right now?",
          "Thank you for opening up. It takes courage to express your thoughts. Can you tell me more about what's been on your mind?",
          "That's a really thoughtful observation. Between sessions, it can help to notice patterns in how we're feeling. Would you like to explore that further?",
          "I'm glad you reached out. Remember, every step — even a small one — counts. What's one thing that helped you feel better recently?",
        ];
        const fallback =
          fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)] ?? fallbackResponses[0] ?? '';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: fallback } : m,
          ),
        );
        addToast({ title: 'Using offline mode — responses are pre-generated', variant: 'info' });
      }
    } finally {
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
    <div className="flex h-full flex-col">
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
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={`Hi ${firstName}, what's on your mind?`}
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
