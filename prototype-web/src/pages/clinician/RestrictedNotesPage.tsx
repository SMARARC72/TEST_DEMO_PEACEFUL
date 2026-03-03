// ─── Restricted Notes Page (C-12) ────────────────────────────────────
// Separate surface for restricted/sensitive notes with audit metadata.
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { clinicianApi } from '@/api/clinician';
import { useUIStore } from '@/stores/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import type { RestrictedNote, RestrictedNoteType } from '@/api/types';

const typeVariant: Record<RestrictedNoteType, 'default' | 'info' | 'warning' | 'danger' | 'success'> = {
  SAFETY: 'danger',
  LEGAL: 'warning',
  SUBSTANCE: 'info',
  OTHER: 'default',
};

const typeIcon: Record<RestrictedNoteType, string> = {
  SAFETY: '🛑',
  LEGAL: '⚖️',
  SUBSTANCE: '🧪',
  OTHER: '📄',
};

export default function RestrictedNotesPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const addToast = useUIStore((s) => s.addToast);
  const [notes, setNotes] = useState<RestrictedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    (async () => {
      const [data, err] = await clinicianApi.getRestrictedNotes(patientId);
      if (cancelled) return;
      if (err) addToast({ title: 'Failed to load restricted notes', variant: 'error' });
      if (data) setNotes(data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [patientId, addToast]);

  const selected = notes.find((n) => n.id === selectedId);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Special handling banner */}
      <div className="rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-700 dark:bg-red-900/30">
        <p className="text-sm font-medium text-red-800 dark:text-red-200">
          🔒 Special Handling — Restricted Notes Surface
        </p>
        <p className="text-xs text-red-700 dark:text-red-300 mt-1">
          These notes are excluded from standard exports and require explicit authorization. 42 CFR Part 2 segmentation applies.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Restricted Notes</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{notes.length} restricted entries</p>
        </div>
        <Link to={`/clinician/patients/${patientId}`}>
          <Button variant="ghost" size="sm">← Patient</Button>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* List */}
        <div className="space-y-3">
          {notes.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-neutral-500">No restricted notes for this patient.</CardContent></Card>
          ) : (
            notes.map((note) => (
              <Card
                key={note.id}
                className={`cursor-pointer transition-shadow hover:shadow-md ${selectedId === note.id ? 'ring-2 ring-brand-500' : ''}`}
                onClick={() => setSelectedId(note.id)}
              >
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span aria-hidden="true">{typeIcon[note.type]}</span>
                      <Badge variant={typeVariant[note.type]}>{note.type}</Badge>
                    </div>
                    <span className="text-xs text-neutral-500">{new Date(note.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="font-medium text-neutral-900 dark:text-white">{note.title}</p>
                  {note.excludedFromExports && (
                    <span className="text-xs text-red-600 dark:text-red-400">⊘ Excluded from standard exports</span>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Detail panel */}
        {selected ? (
          <Card className="lg:sticky lg:top-4 self-start">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span aria-hidden="true">{typeIcon[selected.type]}</span>
                {selected.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Badge variant={typeVariant[selected.type]}>{selected.type}</Badge>

              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm whitespace-pre-wrap dark:border-neutral-700 dark:bg-neutral-900">
                {selected.content}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-medium text-neutral-500 mb-1">Created By</p>
                  <p className="text-neutral-700 dark:text-neutral-300">{selected.createdBy}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-500 mb-1">Created</p>
                  <p className="text-neutral-700 dark:text-neutral-300">{new Date(selected.createdAt).toLocaleString()}</p>
                </div>
                {selected.updatedAt && (
                  <div>
                    <p className="text-xs font-medium text-neutral-500 mb-1">Last Updated</p>
                    <p className="text-neutral-700 dark:text-neutral-300">{new Date(selected.updatedAt).toLocaleString()}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-neutral-500 mb-1">Export Status</p>
                  <p className={selected.excludedFromExports ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                    {selected.excludedFromExports ? 'Excluded' : 'Included'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-neutral-500 mb-1">Audit Trail</p>
                <p className="text-xs font-mono text-neutral-400 break-all">{selected.auditTrail}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="lg:sticky lg:top-4 self-start">
            <CardContent className="py-12 text-center text-sm text-neutral-500">
              Select a note to view details.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
