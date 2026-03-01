// ─── Exports Center Page (C-13) ──────────────────────────────────────
// Export profiles, BLOCKED_POLICY state, manifest cards, confirmations.
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { clinicianApi } from '@/api/clinician';
import { useUIStore } from '@/stores/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import type { ExportJob, ExportStatus, ExportProfile } from '@/api/types';

const statusVariant: Record<ExportStatus, 'default' | 'info' | 'warning' | 'danger' | 'success'> = {
  QUEUED: 'default',
  GENERATING: 'info',
  READY: 'success',
  BLOCKED_POLICY: 'danger',
  EXPIRED: 'warning',
  FAILED: 'danger',
};

const profileDescriptions: Record<ExportProfile, string> = {
  STANDARD: 'Standard clinical data export. Excludes restricted notes and SUD-segmented content.',
  SEGMENTED_SUD: 'Includes substance use disorder data. Requires 42 CFR Part 2 authorization.',
  RESTRICTED: 'Full export including restricted notes. Requires step-up authentication and supervisor approval.',
};

export default function ExportsCenterPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const addToast = useUIStore((s) => s.addToast);
  const [exports, setExports] = useState<ExportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [confirmModal, setConfirmModal] = useState<ExportProfile | null>(null);

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    (async () => {
      const [data] = await clinicianApi.getExports(patientId);
      if (cancelled) return;
      if (data) setExports(data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [patientId]);

  const handleCreateExport = async (profile: ExportProfile) => {
    if (!patientId || creating) return;
    setConfirmModal(null);
    setCreating(true);
    const [job, err] = await clinicianApi.createExport(patientId, { profile, format: 'JSON' });
    setCreating(false);
    if (err) {
      addToast({ title: 'Export failed', description: err.message, variant: 'error' });
      return;
    }
    if (job) {
      setExports((prev) => [job, ...prev]);
      addToast({ title: `Export ${job.status === 'BLOCKED_POLICY' ? 'blocked by policy' : 'created'}`, variant: job.status === 'BLOCKED_POLICY' ? 'warning' : 'success' });
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Exports Center</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Create and manage patient data exports</p>
        </div>
        <Link to={`/clinician/patients/${patientId}`}>
          <Button variant="ghost" size="sm">← Patient</Button>
        </Link>
      </div>

      {/* Export profiles */}
      <Card>
        <CardHeader><CardTitle>Create Export</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {(['STANDARD', 'SEGMENTED_SUD', 'RESTRICTED'] as const).map((profile) => (
              <div key={profile} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
                <p className="font-medium text-neutral-900 dark:text-white text-sm">{profile.replace('_', ' ')}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{profileDescriptions[profile]}</p>
                <Button
                  variant={profile === 'RESTRICTED' ? 'danger' : profile === 'SEGMENTED_SUD' ? 'secondary' : 'primary'}
                  size="sm"
                  className="mt-3 w-full"
                  loading={creating}
                  onClick={() => profile === 'STANDARD' ? handleCreateExport(profile) : setConfirmModal(profile)}
                >
                  {profile === 'RESTRICTED' ? '🔒 Request Export' : 'Create Export'}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export history */}
      <Card>
        <CardHeader><CardTitle>Export History</CardTitle></CardHeader>
        <CardContent>
          {exports.length === 0 ? (
            <p className="py-4 text-center text-sm text-neutral-500">No exports yet.</p>
          ) : (
            <div className="space-y-3">
              {exports.map((job) => (
                <div key={job.id} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant[job.status]}>{job.status.replace('_', ' ')}</Badge>
                      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        {job.profile.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-xs text-neutral-500">{new Date(job.createdAt).toLocaleString()}</span>
                  </div>

                  {job.status === 'BLOCKED_POLICY' && (
                    <div className="rounded border border-red-200 bg-red-50 p-2 mt-2 dark:border-red-800 dark:bg-red-900/20">
                      <p className="text-xs text-red-700 dark:text-red-400">
                        ⊘ Blocked by policy: {job.policyBlockReason ?? 'Restricted content requires supervisor approval'} (HTTP 428)
                      </p>
                    </div>
                  )}

                  {job.status === 'READY' && (
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-neutral-500">Format:</span>{' '}
                        <span className="text-neutral-700 dark:text-neutral-300">{job.format}</span>
                      </div>
                      {job.fileSize && (
                        <div>
                          <span className="text-neutral-500">Size:</span>{' '}
                          <span className="text-neutral-700 dark:text-neutral-300">{job.fileSize}</span>
                        </div>
                      )}
                      {job.checksum && (
                        <div>
                          <span className="text-neutral-500">Checksum:</span>{' '}
                          <span className="font-mono text-neutral-700 dark:text-neutral-300">{job.checksum.slice(0, 12)}…</span>
                        </div>
                      )}
                    </div>
                  )}

                  {job.expiresAt && (
                    <p className="text-xs text-neutral-400 mt-1">Expires: {new Date(job.expiresAt).toLocaleString()}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation modal */}
      {confirmModal && (
        <Modal
          open={!!confirmModal}
          onClose={() => setConfirmModal(null)}
          title={`Confirm ${confirmModal.replace('_', ' ')} Export`}
        >
          <div className="space-y-4">
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              {confirmModal === 'SEGMENTED_SUD'
                ? 'This export includes substance use disorder data protected under 42 CFR Part 2. Ensure proper authorization has been obtained.'
                : 'This export includes restricted notes and sensitive data. Step-up authentication and supervisor approval may be required.'}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmModal(null)}>Cancel</Button>
              <Button
                variant={confirmModal === 'RESTRICTED' ? 'danger' : 'primary'}
                size="sm"
                onClick={() => handleCreateExport(confirmModal)}
              >
                Confirm Export
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
