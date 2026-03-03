// ─── Feedback Widget ─────────────────────────────────────────────────
// Floating feedback button that opens a small form. Stores feedback
// in localStorage and sends it to API when available.

import { useState, useRef } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import { Button } from '@/components/ui/Button';

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [submitted, setSubmitted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);

  // Don't show for unauthenticated users
  if (!user) return null;

  const handleSubmit = () => {
    if (!feedback.trim() && rating === 0) return;

    // Store feedback locally
    const existing = JSON.parse(localStorage.getItem('peacefull-feedback') ?? '[]') as unknown[];
    existing.push({
      userId: user.id,
      rating,
      feedback: feedback.trim(),
      page: window.location.pathname,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem('peacefull-feedback', JSON.stringify(existing));

    // Best-effort send to API
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api/v1';
      const token = useAuthStore.getState().accessToken;
      fetch(`${apiUrl}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ rating, feedback: feedback.trim(), page: window.location.pathname }),
      }).catch(() => { /* best-effort */ });
    } catch { /* ignore */ }

    setSubmitted(true);
    addToast({ title: 'Thank you for your feedback!', variant: 'success' });
    setTimeout(() => {
      setOpen(false);
      setSubmitted(false);
      setFeedback('');
      setRating(0);
    }, 1500);
  };

  return (
    <>
      {/* Floating trigger button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-40 rounded-full bg-brand-600 p-3 text-white shadow-lg transition-transform hover:scale-110 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          aria-label="Send feedback"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}

      {/* Feedback panel */}
      {open && (
        <div
          ref={ref}
          className="fixed bottom-20 right-4 z-50 w-80 rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl dark:border-neutral-700 dark:bg-neutral-800"
        >
          {submitted ? (
            <div className="py-4 text-center">
              <span className="text-3xl">🙏</span>
              <p className="mt-2 font-semibold text-neutral-900 dark:text-white">Thanks!</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  How's your experience?
                </h3>
                <button
                  onClick={() => setOpen(false)}
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                  aria-label="Close feedback"
                >
                  ✕
                </button>
              </div>

              {/* Rating */}
              <div className="mb-3 flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`text-2xl transition-transform hover:scale-125 ${
                      star <= rating ? 'opacity-100' : 'opacity-30'
                    }`}
                    aria-label={`${star} star${star > 1 ? 's' : ''}`}
                  >
                    ⭐
                  </button>
                ))}
              </div>

              {/* Text feedback */}
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Tell us more (optional)..."
                rows={3}
                className="mb-3 w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white"
              />

              <Button onClick={handleSubmit} className="w-full" size="sm">
                Send Feedback
              </Button>
            </>
          )}
        </div>
      )}
    </>
  );
}
