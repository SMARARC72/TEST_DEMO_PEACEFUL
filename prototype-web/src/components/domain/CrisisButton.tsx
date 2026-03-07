// ─── Crisis Button ───────────────────────────────────────────────────
// Patient-facing crisis alert button. Sends POST /crisis/alert and
// displays confirmation with emergency numbers.

import { useState, useCallback, useEffect } from 'react';
import { apiPost } from '@/api/client';
import { patientApi } from '@/api/patients';
import { useAuthStore } from '@/stores/auth';

interface CrisisAlertResponse {
  success: boolean;
  message: string;
  crisisResources: {
    name: string;
    contact: string;
    type: string;
  }[];
}

export function CrisisButton(): React.ReactElement {
  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const user = useAuthStore((s) => s.user);
  const [resolvedPatientId, setResolvedPatientId] = useState<string | null>(null);

  // Resolve the clinical patient ID from user.id (same pattern as ChatPage)
  useEffect(() => {
    const userId = user?.id;
    if (!userId || user?.role !== 'PATIENT') return;
    let cancelled = false;
    (async () => {
      const [patient] = await patientApi.getPatient(userId);
      if (!cancelled && patient) {
        setResolvedPatientId(patient.id);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, user?.role]);

  const handleCrisisAlert = async (): Promise<void> => {
    setStatus('sending');
    try {
      const patientId = resolvedPatientId ?? user?.id;
      const [data] = await apiPost<CrisisAlertResponse>('crisis/alert', {
        patientId,
        context: 'Patient initiated crisis alert from UI',
      });
      if (data) {
        setStatus('sent');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  const handleClose = useCallback((): void => {
    setShowModal(false);
    setStatus('idle');
  }, []);

  if (!user || user.role !== 'PATIENT') return <></>;

  return (
    <>
      {/* Floating crisis button */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-2xl text-white shadow-lg hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-300 dark:focus:ring-red-800"
        aria-label="I need help now — open crisis alert"
        title="Crisis Alert"
      >
        🆘
      </button>

      {/* Crisis Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="crisis-title"
          aria-describedby="crisis-desc"
        >
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800">
            <h2 id="crisis-title" className="mb-2 text-lg font-bold text-red-700 dark:text-red-400">
              {status === 'sent' ? 'Your Care Team Has Been Notified' : 'Do You Need Immediate Help?'}
            </h2>

            {status === 'idle' && (
              <>
                <p id="crisis-desc" className="mb-4 text-sm text-gray-600 dark:text-gray-300">
                  If you are experiencing a mental health crisis, we can notify your care team immediately.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleCrisisAlert}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    Notify My Care Team
                  </button>
                  <button
                    onClick={handleClose}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {status === 'sending' && (
              <div className="flex items-center gap-3 py-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Sending alert...</span>
              </div>
            )}

            {status === 'sent' && (
              <div id="crisis-desc">
                <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
                  Your care team has been notified and will respond as quickly as possible.
                </p>
                <button
                  onClick={handleClose}
                  className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  OK
                </button>
              </div>
            )}

            {status === 'error' && (
              <div id="crisis-desc">
                <p className="mb-4 text-sm text-red-600 dark:text-red-400">
                  We couldn't send the alert. Please use one of the numbers below to get help immediately.
                </p>
                <button
                  onClick={handleClose}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                >
                  Close
                </button>
              </div>
            )}

            {/* Emergency numbers — always visible */}
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-xs font-semibold text-red-800 dark:text-red-300">
                If you are in immediate danger:
              </p>
              <ul className="mt-1 space-y-1 text-sm text-red-700 dark:text-red-400">
                <li>
                  <a href="tel:988" className="font-bold underline">988</a> — Suicide &amp; Crisis Lifeline
                </li>
                <li>
                  <a href="sms:741741?body=HOME" className="font-bold underline">Text HOME to 741741</a> — Crisis Text Line
                </li>
                <li>
                  <a href="tel:911" className="font-bold underline">911</a> — Emergency Services
                </li>
                <li>
                  <a href="tel:18006624357" className="font-bold underline">1-800-662-4357</a> — SAMHSA Helpline
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
