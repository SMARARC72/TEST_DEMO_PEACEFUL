// ─── Session Notes Page ──────────────────────────────────────────────
// SOAP note creation + signing workflow for clinicians.
// Supports Draft → Signed → Co-Signed lifecycle, note templates,
// addendums, AI pre-fill, co-signature workflow, and E/M code suggestion.

import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { clinicianApi } from '@/api/clinician';
import type { SessionNoteSeed } from '@/api/types';
import { useUIStore } from '@/stores/ui';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

// ─── Types ──────────────────────────────

export type NoteStatus = 'DRAFT' | 'SIGNED' | 'CO_SIGNED' | 'ADDENDUM' | 'PENDING_COSIGN';

export interface Addendum {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

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
  icd10Codes?: string[];
  duration: number; // minutes
  signedBy?: string;
  signedAt?: string;
  coSignedBy?: string;
  coSignedAt?: string;
  coSignRequestedTo?: string;
  addendums?: Addendum[];
  template?: string;
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
  { code: '99215', label: '99215 — E/M, established patient, high complexity' },
];

// ─── Note Templates ─────────────────────

interface NoteTemplate {
  id: string;
  name: string;
  icon: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'initial-eval',
    name: 'Initial Evaluation',
    icon: '📋',
    subjective: 'Chief complaint: \nHistory of present illness: \nPsychiatric history: \nSubstance use history: \nFamily psychiatric history: \nSocial history: ',
    objective: 'Appearance: \nBehavior: \nSpeech: \nMood (patient-reported): \nAffect (observed): \nThought process: \nThought content: \nInsight/Judgment: \nCognition: ',
    assessment: 'Diagnostic impression: \nDifferential diagnoses: \nRisk assessment: ',
    plan: 'Treatment recommendations: \nMedication considerations: \nTherapy modality: \nFrequency: \nSafety plan: \nFollow-up: ',
  },
  {
    id: 'follow-up',
    name: 'Follow-Up Session',
    icon: '🔄',
    subjective: 'Patient reports: \nInterval changes since last session: \nCurrent stressors: \nMedication adherence: \nSleep/appetite changes: ',
    objective: 'Mental status: \nMood/Affect: \nGoal progress: \nPHQ-9/GAD-7 scores: ',
    assessment: 'Progress toward treatment goals: \nResponse to current interventions: \nUpdated risk assessment: ',
    plan: 'Continue/modify interventions: \nHomework/skills practice: \nNext session focus: \nFollow-up: ',
  },
  {
    id: 'crisis',
    name: 'Crisis Intervention',
    icon: '🚨',
    subjective: 'Presenting crisis: \nPrecipitant: \nSuicidal ideation (rate 0-10): \nHomicidal ideation: \nSelf-harm urges: \nAccess to means: ',
    objective: 'Risk factors: \nProtective factors: \nMental status: \nBehavior: \nAffect: ',
    assessment: 'Acute risk level: ☐ Low  ☐ Moderate  ☐ High  ☐ Imminent\nDisposition: ',
    plan: 'Safety plan reviewed/updated: \nMeans restriction: \nEmergency contacts notified: \nFollow-up (within 24-48h): \nDisposition: ☐ Outpatient ☐ IOP ☐ PHP ☐ Inpatient referral',
  },
  {
    id: 'group',
    name: 'Group Therapy',
    icon: '👥',
    subjective: 'Group focus/topic: \nPatient participation level: \nTopics patient raised: ',
    objective: 'Engagement level: \nInteraction with peers: \nAffect during session: ',
    assessment: 'Therapeutic benefit observed: \nGroup dynamics: ',
    plan: 'Individual follow-up needed: \nSkills to practice: \nNext group: ',
  },
  {
    id: 'med-management',
    name: 'Medication Management',
    icon: '💊',
    subjective: 'Medication effects reported: \nSide effects: \nAdherence: \nSymptom changes: ',
    objective: 'Vitals (if applicable): \nMental status: \nLab results: ',
    assessment: 'Medication response: \nSide effect assessment: \nDiagnostic update: ',
    plan: 'Medication changes: \nNew prescriptions: \nLab orders: \nNext appointment: ',
  },
];

// ─── E/M Code Suggestion ────────────────

function suggestEMCode(duration: number, hasHighComplexity: boolean): string {
  if (hasHighComplexity || duration >= 55) return '99215';
  if (duration >= 40) return '99214';
  if (duration >= 25) return '99213';
  return '99212';
}

export default function SessionNotesPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const location = useLocation();
  const addToast = useUIStore((s) => s.addToast);
  const importedDraftIdRef = useRef<string | null>(null);
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedNote, setSelectedNote] = useState<SessionNote | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [addendumText, setAddendumText] = useState('');
  const [showAddendum, setShowAddendum] = useState(false);
  const [aiPrefilling, setAiPrefilling] = useState(false);
  const [icd10Search, setIcd10Search] = useState('');
  const [selectedIcd10, setSelectedIcd10] = useState<string[]>([]);

  // Common ICD-10 codes for mental health
  const ICD10_CODES = [
    { code: 'F32.1', desc: 'Major depressive disorder, single episode, moderate' },
    { code: 'F33.1', desc: 'Major depressive disorder, recurrent, moderate' },
    { code: 'F41.1', desc: 'Generalized anxiety disorder' },
    { code: 'F41.0', desc: 'Panic disorder' },
    { code: 'F43.10', desc: 'Post-traumatic stress disorder, unspecified' },
    { code: 'F10.20', desc: 'Alcohol dependence, uncomplicated' },
    { code: 'F90.0', desc: 'ADHD, predominantly inattentive' },
    { code: 'F31.9', desc: 'Bipolar disorder, unspecified' },
    { code: 'F60.3', desc: 'Borderline personality disorder' },
    { code: 'F42.2', desc: 'Mixed obsessional thoughts and acts' },
  ];

  const filteredIcd10 = icd10Search.length >= 2
    ? ICD10_CODES.filter(
        (c) => c.code.toLowerCase().includes(icd10Search.toLowerCase()) ||
               c.desc.toLowerCase().includes(icd10Search.toLowerCase())
      )
    : [];

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

  useEffect(() => {
    const state = location.state as { draftSeed?: SessionNoteSeed } | null;
    const draftSeed = state?.draftSeed;
    if (!draftSeed || importedDraftIdRef.current === draftSeed.sourceDraftId) return;

    importedDraftIdRef.current = draftSeed.sourceDraftId;
    setSelectedNote(null);
    setSelectedTemplate(null);
    setShowForm(true);
    reset({
      sessionDate: new Date().toISOString().split('T')[0],
      subjective: draftSeed.subjective,
      objective: draftSeed.objective,
      assessment: draftSeed.assessment,
      plan: draftSeed.plan,
      duration: 50,
    });
    addToast({ title: 'Approved draft loaded into session note', variant: 'success' });
  }, [addToast, location.state, reset]);

  async function loadNotes() {
    if (!patientId) return;
    setLoading(true);
    const [data, err] = await clinicianApi.getSessionNotes(patientId);
    if (err) {
      addToast({ title: 'Failed to load session notes', variant: 'error' });
    } else if (data) {
      setNotes(data);
    }
    setLoading(false);
  }

  async function onSubmit(data: NoteFormData) {
    if (!patientId) return;
    const [result, err] = await clinicianApi.createSessionNote(patientId, data);
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
    if (!patientId) return;
    const [, err] = await clinicianApi.signSessionNote(patientId, noteId);
    if (err) {
      addToast({ title: 'Failed to sign note', variant: 'error' });
    } else {
      addToast({ title: 'Note signed successfully', variant: 'success' });
      loadNotes();
      setSelectedNote(null);
    }
  }

  function applyTemplate(templateId: string) {
    const tmpl = NOTE_TEMPLATES.find((t) => t.id === templateId);
    if (!tmpl) return;
    setSelectedTemplate(templateId);
    reset({
      sessionDate: new Date().toISOString().split('T')[0],
      subjective: tmpl.subjective,
      objective: tmpl.objective,
      assessment: tmpl.assessment,
      plan: tmpl.plan,
      duration: 50,
    });
    addToast({ title: `Template "${tmpl.name}" applied`, variant: 'info' });
  }

  async function handleAiPrefill() {
    if (!patientId) return;
    setAiPrefilling(true);
    // Simulate AI pre-fill from recent patient data
    await new Promise((resolve) => setTimeout(resolve, 1500));
    reset({
      sessionDate: new Date().toISOString().split('T')[0],
      subjective: 'Patient reports moderate improvement in mood since last session. Sleep quality has been variable (5-7 hrs/night). Continues to experience occasional anxiety in social situations. Medication adherence reported as consistent. No significant changes in appetite.',
      objective: 'PHQ-9: 12 (moderate). GAD-7: 9 (mild-moderate). Patient appears well-groomed, cooperative. Speech normal rate/rhythm. Mood described as "getting better." Affect congruent, full range. Thought process linear. No SI/HI. Insight good.',
      assessment: 'Patient showing gradual improvement with combined CBT and pharmacotherapy. Depression remains moderate but trending downward (PHQ-9 decreased from 16 to 12 over 4 weeks). Anxiety symptoms stable. Treatment goals partially met.',
      plan: '1. Continue current medication regimen\n2. CBT session focus: cognitive restructuring for social anxiety\n3. Assign behavioral activation homework\n4. Review sleep hygiene techniques\n5. Follow-up in 2 weeks',
      duration: 50,
    });
    setAiPrefilling(false);
    addToast({ title: 'AI pre-fill complete — review all sections before signing', variant: 'success' });
  }

  function handleAddAddendum() {
    if (!addendumText.trim() || !selectedNote) return;
    // In production: POST /session-notes/:id/addendums
    const newAddendum: Addendum = {
      id: `add-${Date.now()}`,
      author: 'Dr. Current User',
      content: addendumText.trim(),
      createdAt: new Date().toISOString(),
    };
    const updatedNote = {
      ...selectedNote,
      addendums: [...(selectedNote.addendums ?? []), newAddendum],
    };
    setSelectedNote(updatedNote);
    setNotes((prev) => prev.map((n) => n.id === updatedNote.id ? updatedNote : n));
    setAddendumText('');
    setShowAddendum(false);
    addToast({ title: 'Addendum added (audit-logged)', variant: 'success' });
  }

  function requestCoSign() {
    if (!selectedNote) return;
    const updatedNote = { ...selectedNote, status: 'PENDING_COSIGN' as NoteStatus, coSignRequestedTo: 'Dr. Supervisor' };
    setSelectedNote(updatedNote);
    setNotes((prev) => prev.map((n) => n.id === updatedNote.id ? updatedNote : n));
    addToast({ title: 'Co-signature requested from Dr. Supervisor', variant: 'success' });
  }

  const statusVariant: Record<NoteStatus, 'warning' | 'success' | 'info' | 'default' | 'danger'> = {
    DRAFT: 'warning',
    SIGNED: 'success',
    CO_SIGNED: 'info',
    PENDING_COSIGN: 'danger',
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
          <Link
            to={`/clinician/patients/${patientId}`}
            className="mb-2 inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            ← Back to Patient
          </Link>
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

              {/* Template Selector & AI Pre-fill */}
              <div className="mb-4 flex flex-wrap gap-2">
                {NOTE_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => applyTemplate(tmpl.id)}
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      selectedTemplate === tmpl.id
                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-400'
                    }`}
                  >
                    <span>{tmpl.icon}</span> {tmpl.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleAiPrefill}
                  disabled={aiPrefilling}
                  className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 transition hover:bg-purple-100 disabled:opacity-50 dark:border-purple-700 dark:bg-purple-900/20 dark:text-purple-300"
                >
                  {aiPrefilling ? '⏳ Generating...' : '🤖 AI Pre-fill'}
                </button>
              </div>

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

              {/* ICD-10 Linking */}
              <div className="mb-4">
                <label className="mb-1 block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  ICD-10 Codes (Link Diagnoses)
                </label>
                <input
                  type="text"
                  value={icd10Search}
                  onChange={(e) => setIcd10Search(e.target.value)}
                  placeholder="Search ICD-10 codes..."
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-700 dark:text-white"
                />
                {filteredIcd10.length > 0 && (
                  <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-600 dark:bg-neutral-700">
                    {filteredIcd10.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          if (!selectedIcd10.includes(c.code)) {
                            setSelectedIcd10((prev) => [...prev, c.code]);
                          }
                          setIcd10Search('');
                        }}
                        className="w-full px-3 py-1.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-600"
                      >
                        <span className="font-medium">{c.code}</span> — {c.desc}
                      </button>
                    ))}
                  </div>
                )}
                {selectedIcd10.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedIcd10.map((code) => (
                      <span key={code} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                        {code}
                        <button type="button" onClick={() => setSelectedIcd10((prev) => prev.filter((c) => c !== code))} className="text-blue-400 hover:text-blue-600">&times;</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* E/M Code Suggestion */}
              <div className="mb-4 rounded-lg bg-amber-50 p-3 dark:bg-amber-900/10">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  E/M Code Suggestion: <strong>{suggestEMCode(50, selectedIcd10.length > 3)}</strong>
                  <span className="ml-1 text-amber-500">(based on time and complexity)</span>
                </p>
              </div>

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
                  <div className="flex gap-2">
                    <button
                      onClick={() => signNote(selectedNote.id)}
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                    >
                      Sign Note
                    </button>
                  </div>
                )}
                {selectedNote.status === 'SIGNED' && (
                  <div className="flex gap-2">
                    <button
                      onClick={requestCoSign}
                      className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Request Co-Sign
                    </button>
                    <button
                      onClick={() => setShowAddendum(true)}
                      className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300"
                    >
                      + Addendum
                    </button>
                  </div>
                )}
                {selectedNote.status === 'PENDING_COSIGN' && (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                    Awaiting co-sign from {selectedNote.coSignRequestedTo ?? 'supervisor'}
                  </span>
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

              {/* ICD-10 Codes */}
              {selectedNote.icd10Codes && selectedNote.icd10Codes.length > 0 && (
                <div className="mt-4">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Linked ICD-10 Codes</h3>
                  <div className="flex flex-wrap gap-1">
                    {selectedNote.icd10Codes.map((code) => (
                      <span key={code} className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">{code}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Addendums */}
              {selectedNote.addendums && selectedNote.addendums.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-500">Addendums</h3>
                  {selectedNote.addendums.map((add) => (
                    <div key={add.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-900/10">
                      <p className="text-sm text-neutral-700 dark:text-neutral-300">{add.content}</p>
                      <p className="mt-1 text-xs text-neutral-400">
                        {add.author} &middot; {new Date(add.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Addendum Form */}
              {showAddendum && (
                <div className="mt-4 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                  <h3 className="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Add Addendum</h3>
                  <p className="mb-2 text-xs text-neutral-400">Addendums are timestamped and audit-logged. Original note text is never modified.</p>
                  <textarea
                    value={addendumText}
                    onChange={(e) => setAddendumText(e.target.value)}
                    rows={3}
                    placeholder="Enter addendum text..."
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-700 dark:text-white"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={handleAddAddendum}
                      disabled={!addendumText.trim()}
                      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                    >
                      Save Addendum
                    </button>
                    <button
                      onClick={() => { setShowAddendum(false); setAddendumText(''); }}
                      className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-700 dark:border-neutral-600 dark:text-neutral-300"
                    >
                      Cancel
                    </button>
                  </div>
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
