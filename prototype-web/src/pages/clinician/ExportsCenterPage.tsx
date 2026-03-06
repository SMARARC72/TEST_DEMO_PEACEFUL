// ─── Exports Center Page (C-13) ──────────────────────────────────────
// Export profiles, BLOCKED_POLICY state, manifest cards, confirmations.
import { useCallback, useEffect, useMemo, useState } from 'react';
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

const ACTIVE_EXPORT_STATUSES: ExportStatus[] = ['QUEUED', 'GENERATING'];
const EXPORT_POLL_INTERVAL_MS = 5000;

export default function ExportsCenterPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const addToast = useUIStore((s) => s.addToast);
  const [exports, setExports] = useState<ExportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [confirmModal, setConfirmModal] = useState<ExportProfile | null>(null);
  const [polling, setPolling] = useState(false);

  const loadExports = useCallback(async (showErrorToast = true) => {
    if (!patientId) return [] as ExportJob[];

    const [data, err] = await clinicianApi.getExports(patientId);
    if (err) {
      if (showErrorToast) {
        addToast({ title: 'Failed to load exports', variant: 'error' });
      }
      return [] as ExportJob[];
    }

    const jobs = data ?? [];
    setExports(jobs);
    return jobs;
  }, [patientId, addToast]);

  const hasActiveExports = useMemo(
    () => exports.some((job) => ACTIVE_EXPORT_STATUSES.includes(job.status)),
    [exports],
  );

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    (async () => {
      const [data, err] = await clinicianApi.getExports(patientId);
      if (cancelled) return;
      if (err) addToast({ title: 'Failed to load exports', variant: 'error' });
      if (data) setExports(data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [patientId, addToast]);

  useEffect(() => {
    if (!patientId || !hasActiveExports) {
      setPolling(false);
      return;
    }

    setPolling(true);
    const intervalId = window.setInterval(() => {
      void loadExports(false);
    }, EXPORT_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      setPolling(false);
    };
  }, [patientId, hasActiveExports, loadExports]);

  const [exportFormat, setExportFormat] = useState<'JSON' | 'PDF'>('JSON');

  const handleCreateExport = async (profile: ExportProfile) => {
    if (!patientId || creating) return;
    setConfirmModal(null);
    setCreating(true);

    // If PDF format selected, generate client-side PDF from the export data
    if (exportFormat === 'PDF') {
      const [job, err] = await clinicianApi.createExport(patientId, { profile, format: 'JSON' });
      setCreating(false);
      if (err) {
        addToast({ title: 'Export failed', description: err.message, variant: 'error' });
        return;
      }
      if (job) {
        try {
          const { downloadPatientPdf } = await import('@/utils/pdfExport');
          // Use the job data to generate a PDF
          downloadPatientPdf(
            { exportId: job.id, profile: job.profile, status: job.status, format: 'PDF', createdAt: job.createdAt } as unknown as Record<string, unknown>,
            `patient-${patientId}`,
          );
          addToast({ title: 'PDF export downloaded', variant: 'success' });
          setExports((prev) => [{ ...job, format: 'PDF' }, ...prev]);
        } catch {
          addToast({ title: 'PDF generation failed', variant: 'error' });
        }
      }
      return;
    }

    const [job, err] = await clinicianApi.createExport(patientId, { profile, format: 'JSON' });
    setCreating(false);
    if (err) {
      addToast({ title: 'Export failed', description: err.message, variant: 'error' });
      return;
    }
    if (job) {
      setExports((prev) => [job, ...prev]);
      addToast({ title: `Export ${job.status === 'BLOCKED_POLICY' ? 'blocked by policy' : 'created'}`, variant: job.status === 'BLOCKED_POLICY' ? 'warning' : 'success' });
      if (ACTIVE_EXPORT_STATUSES.includes(job.status)) {
        void loadExports(false);
      }
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

      {/* Export format selector */}
      <Card>
        <CardHeader><CardTitle>Export Format</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {(['JSON', 'PDF'] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setExportFormat(fmt)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  exportFormat === fmt
                    ? 'bg-brand-600 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
          {exportFormat === 'PDF' && (
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              PDF exports are generated in-browser. The document includes HIPAA confidentiality headers.
            </p>
          )}
        </CardContent>
      </Card>

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
          {polling && (
            <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
              Refreshing export statuses automatically while jobs are still running.
            </p>
          )}
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
