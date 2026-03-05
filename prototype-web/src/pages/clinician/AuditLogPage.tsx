// ─── Audit Log Page ──────────────────────────────────────────────────
// HIPAA-required audit trail viewer. Shows access log for PHI with
// filtering, search, and CSV export for compliance officers.

import { useState, useEffect, useMemo } from 'react';
import { useUIStore } from '@/stores/ui';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { apiGet } from '@/api/client';
import type { AuditLogEntry } from '@/api/types';

const ACTION_LABELS: Record<string, { label: string; variant: 'default' | 'info' | 'warning' | 'danger' | 'success' }> = {
  VIEW_PATIENT_RECORD: { label: 'View Record', variant: 'info' },
  SUBMIT_MBC_SCORE: { label: 'MBC Score', variant: 'success' },
  UPDATE_TREATMENT_PLAN: { label: 'Treatment Plan', variant: 'warning' },
  EXPORT_DATA: { label: 'Data Export', variant: 'danger' },
  LOGIN: { label: 'Login', variant: 'default' },
  LOGOUT: { label: 'Logout', variant: 'default' },
  CREATE_ESCALATION: { label: 'Escalation', variant: 'danger' },
  RESOLVE_ESCALATION: { label: 'Resolve', variant: 'success' },
  CONSENT_GRANTED: { label: 'Consent', variant: 'success' },
  CONSENT_WITHDRAWN: { label: 'Consent Withdrawn', variant: 'warning' },
};

export default function AuditLogPage() {
  const addToast = useUIStore((s) => s.addToast);
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  useEffect(() => {
    (async () => {
      const [data, err] = await apiGet<AuditLogEntry[]>('clinician/audit-log');
      if (err) {
        addToast({ title: 'Failed to load audit log', variant: 'error' });
      } else if (data) {
        setEntries(data);
      }
      setLoading(false);
    })();
  }, [addToast]);

  const filtered = useMemo(() => {
    let result = entries;
    if (actionFilter !== 'ALL') {
      result = result.filter((e) => e.action === actionFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.action.toLowerCase().includes(q) ||
          e.resourceType.toLowerCase().includes(q) ||
          e.userId.toLowerCase().includes(q) ||
          (e.resourceId ?? '').toLowerCase().includes(q),
      );
    }
    return result;
  }, [entries, actionFilter, search]);

  const uniqueActions = useMemo(() => {
    const actions = new Set(entries.map((e) => e.action));
    return Array.from(actions).sort();
  }, [entries]);

  function exportCSV() {
    const headers = ['Timestamp', 'User', 'Action', 'Resource Type', 'Resource ID', 'IP Address'];
    const rows = filtered.map((e) => [
      new Date(e.timestamp).toISOString(),
      e.userId,
      e.action,
      e.resourceType,
      e.resourceId,
      e.ipAddress,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `peacefull-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({ title: 'Audit log exported', variant: 'success' });
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Audit Log</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            HIPAA-compliant access audit trail • {entries.length} entries
          </p>
        </div>
        <Button onClick={exportCSV} size="sm" variant="ghost">
          📥 Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by user, action, resource…"
          className="w-64 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
        />
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
        >
          <option value="ALL">All Actions</option>
          {uniqueActions.map((a) => (
            <option key={a} value={a}>
              {ACTION_LABELS[a]?.label ?? a}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
        {filtered.length === 0 ? (
          <p className="p-6 text-sm text-neutral-500 dark:text-neutral-400">No matching audit entries.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Resource</th>
                  <th className="px-4 py-3">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {filtered
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((entry) => {
                    const actionInfo = ACTION_LABELS[entry.action];
                    return (
                      <tr key={entry.id} className="border-b border-neutral-100 dark:border-neutral-700/50">
                        <td className="px-4 py-3 text-xs text-neutral-500 dark:text-neutral-400">
                          {new Date(entry.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">
                          {entry.userId}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={actionInfo?.variant ?? 'default'}>
                            {actionInfo?.label ?? entry.action}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-500 dark:text-neutral-400">
                          {entry.resourceType} / {entry.resourceId}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-neutral-400">
                          {entry.ipAddress}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-lg bg-blue-50 p-3 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
        <strong>Retention Policy:</strong> Audit logs are retained for 7 years per HIPAA §164.312(b).
        Entries older than 90 days are archived to cold storage. Contact your compliance officer for
        archived log access.
      </div>
    </div>
  );
}
