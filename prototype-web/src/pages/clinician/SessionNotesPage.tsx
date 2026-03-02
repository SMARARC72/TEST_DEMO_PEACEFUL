// ─── Session Notes Page ──────────────────────────────────────────────
// SOAP note creation + signing workflow for clinicians.
// Supports Draft → Signed → Co-Signed lifecycle.

import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { clinicianApi } from '@/api/clinician';
import { useUIStore } from '@/stores/ui';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

// ─── Types ──────────────────────────────

export type NoteStatus = 'DRAFT' | 'SIGNED' | 'CO_SIGNED' | 'ADDENDUM';

export interface SessionNote {
  id: string;
  patientId: string;
  sessionDate: string;
  status: NoteStatus;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  cptCode?: string;
  duration: number; // minutes
  signedBy?: string;
  signedAt?: string;
  coSignedBy?: string;
  coSignedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

const noteSchema = z.object({
  sessionDate: z.string().min(1, 'Session date is required'),
  subjective: z.string().min(10, 'Subjective section must be at least 10 characters'),
  objective: z.string().min(10, 'Objective section must be at least 10 characters'),
  assessment: z.string().min(10, 'Assessment section must be at least 10 characters'),
  plan: z.string().min(10, 'Plan section must be at least 10 characters'),
  cptCode: z.string().optional(),
  duration: z.number().min(1).max(480),
});

type NoteFormData = z.infer<typeof noteSchema>;

const CPT_CODES = [
  { code: '90837', label: '90837 — Psychotherapy, 60 min' },
  { code: '90834', label: '90834 — Psychotherapy, 45 min' },
  { code: '90832', label: '90832 — Psychotherapy, 30 min' },
  { code: '90847', label: '90847 — Family psychotherapy with patient' },
  { code: '99213', label: '99213 — E/M, established patient, low complexity' },
  { code: '99214', label: '99214 — E/M, established patient, moderate complexity' },
];

export default function SessionNotesPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const addToast = useUIStore((s) => s.addToast);
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedNote, setSelectedNote] = useState<SessionNote | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NoteFormData>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      sessionDate: new Date().toISOString().split('T')[0],
      duration: 50,
    },
  });

  useEffect(() => {
    if (!patientId) return;
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  async function loadNotes() {
    setLoading(true);
    const [data, err] = await clinicianApi.getSessionNotes(patientId!);
    if (err) {
      addToast({ title: 'Failed to load session notes', variant: 'error' });
    } else if (data) {
      setNotes(data);
    }
    setLoading(false);
  }

  async function onSubmit(data: NoteFormData) {
    const [result, err] = await clinicianApi.createSessionNote(patientId!, data);
    if (err) {
      addToast({ title: 'Failed to save note', variant: 'error' });
    } else if (result) {
      addToast({ title: 'Session note saved as draft', variant: 'success' });
      setShowForm(false);
      reset();
      loadNotes();
    }
  }

  async function signNote(noteId: string) {
    const [, err] = await clinicianApi.signSessionNote(patientId!, noteId);
    if (err) {
      addToast({ title: 'Failed to sign note', variant: 'error' });
    } else {
      addToast({ title: 'Note signed successfully', variant: 'success' });
      loadNotes();
      setSelectedNote(null);
    }
  }

  const statusVariant: Record<NoteStatus, 'warning' | 'success' | 'info' | 'default'> = {
    DRAFT: 'warning',
    SIGNED: 'success',
    CO_SIGNED: 'info',
    ADDENDUM: 'default',
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Session Notes
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            SOAP notes with clinical documentation workflow
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setSelectedNote(null); }}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + New Note
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Notes list */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
            <h2 className="border-b border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-700 dark:border-neutral-700 dark:text-neutral-300">
              All Notes ({notes.length})
            </h2>
            {notes.length === 0 ? (
              <p className="p-4 text-sm text-neutral-400">No session notes yet.</p>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-700/50">
                {notes
                  .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime())
                  .map((note) => (
                    <button
                      key={note.id}
                      onClick={() => { setSelectedNote(note); setShowForm(false); }}
                      className={`w-full px-4 py-3 text-left transition hover:bg-neutral-50 dark:hover:bg-neutral-700/50 ${
                        selectedNote?.id === note.id ? 'bg-brand-50 dark:bg-brand-900/20' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant={statusVariant[note.status]}>
                          {note.status.replace('_', '-')}
                        </Badge>
                        <span className="text-xs text-neutral-400">
                          {note.duration}min
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {new Date(note.sessionDate).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                      {note.cptCode && (
                        <p className="mt-0.5 text-xs text-neutral-400">{note.cptCode}</p>
                      )}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Detail / Form */}
        <div className="lg:col-span-2">
          {showForm ? (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800"
            >
              <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">
                New Session Note
              </h2>

              <div className="mb-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="session-date" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Session Date *
                  </label>
                  <input
                    id="session-date"
                    type="date"
                    {...register('sessionDate')}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-700 dark:text-white"
                  />
                  {errors.sessionDate && <p className="mt-1 text-xs text-red-500">{errors.sessionDate.message}</p>}
                </div>
                <div>
                  <label htmlFor="session-duration" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Duration (min) *
                  </label>
                  <input
                    id="session-duration"
                    type="number"
                    {...register('duration', { valueAsNumber: true })}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-700 dark:text-white"
                  />
                  {errors.duration && <p className="mt-1 text-xs text-red-500">{errors.duration.message}</p>}
                </div>
                <div>
                  <label htmlFor="session-cpt" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    CPT Code
                  </label>
                  <select
                    id="session-cpt"
                    {...register('cptCode')}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-700 dark:text-white"
                  >
                    <option value="">Select...</option>
                    {CPT_CODES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {(['subjective', 'objective', 'assessment', 'plan'] as const).map((section) => (
                <div key={section} className="mb-4">
                  <label htmlFor={`session-${section}`} className="mb-1 block text-sm font-semibold capitalize text-neutral-700 dark:text-neutral-300">
                    {section} *
                  </label>
                  <textarea
                    id={`session-${section}`}
                    {...register(section)}
                    rows={4}
                    placeholder={`Enter ${section} findings...`}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-700 dark:text-white"
                  />
                  {errors[section] && (
                    <p className="mt-1 text-xs text-red-500">{errors[section]?.message}</p>
                  )}
                </div>
              ))}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-700 dark:border-neutral-600 dark:text-neutral-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : selectedNote ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant[selectedNote.status]}>
                      {selectedNote.status.replace('_', '-')}
                    </Badge>
                    {selectedNote.cptCode && (
                      <span className="text-xs text-neutral-400">{selectedNote.cptCode}</span>
                    )}
                  </div>
                  <h2 className="mt-2 text-lg font-semibold text-neutral-900 dark:text-white">
                    Session: {new Date(selectedNote.sessionDate).toLocaleDateString()}
                  </h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Duration: {selectedNote.duration} minutes
                  </p>
                </div>
                {selectedNote.status === 'DRAFT' && (
                  <button
                    onClick={() => signNote(selectedNote.id)}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                  >
                    Sign Note
                  </button>
                )}
              </div>

              {/* SOAP Sections */}
              {(['subjective', 'objective', 'assessment', 'plan'] as const).map((section) => (
                <div key={section} className="mb-4">
                  <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    {section === 'plan' ? 'Plan' : section.charAt(0).toUpperCase() + section.slice(1)}
                  </h3>
                  <p className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">
                    {selectedNote[section]}
                  </p>
                </div>
              ))}

              {/* Signature info */}
              {selectedNote.signedBy && (
                <div className="mt-4 rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Signed by {selectedNote.signedBy} on{' '}
                    {selectedNote.signedAt ? new Date(selectedNote.signedAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
              )}
              {selectedNote.coSignedBy && (
                <div className="mt-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Co-signed by {selectedNote.coSignedBy} on{' '}
                    {selectedNote.coSignedAt ? new Date(selectedNote.coSignedAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-neutral-300 dark:border-neutral-600">
              <p className="text-sm text-neutral-400">
                Select a note from the list or create a new one
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
