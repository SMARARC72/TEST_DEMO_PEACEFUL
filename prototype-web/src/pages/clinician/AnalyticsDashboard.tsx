// ─── Analytics Dashboard ─────────────────────────────────────────────
// KPI dashboard with population health metrics, engagement, and ROI.
// Phase 3 clinician experience.

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { clinicianApi } from '@/api/clinician';
import { useUIStore } from '@/stores/ui';
import { Spinner } from '@/components/ui/Spinner';

// ─── Types ──────────────────────────────

interface AnalyticsData {
  overview: {
    totalPatients: number;
    activePatients: number;
    avgEngagementRate: number;
    avgSignalImprovement: number;
    pendingEscalations: number;
    avgResponseTime: string;
  };
  signalDistribution: { band: string; count: number }[];
  engagementTrend: { week: string; checkins: number; journals: number; voice: number }[];
  outcomesTrend: { month: string; phq9Avg: number; gad7Avg: number }[];
  adherenceByCategory: { category: string; rate: number }[];
  topMetrics: {
    label: string;
    value: string;
    change: number; // positive = improvement
    unit: string;
  }[];
}

const SIGNAL_COLORS: Record<string, string> = {
  LOW: '#22c55e',
  GUARDED: '#eab308',
  MODERATE: '#f97316',
  ELEVATED: '#ef4444',
};

export default function AnalyticsDashboard() {
  const addToast = useUIStore((s) => s.addToast);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  async function loadAnalytics() {
    setLoading(true);
    const [result, err] = await clinicianApi.getAnalytics(period);
    if (err) {
      addToast('Failed to load analytics', 'error');
    } else if (result) {
      setData(result);
    }
    setLoading(false);
  }

  if (loading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const { overview } = data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Analytics</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Population health metrics and outcomes
          </p>
        </div>
        <div className="flex rounded-lg border border-neutral-300 dark:border-neutral-600">
          {(['7d', '30d', '90d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-sm font-medium transition ${
                period === p
                  ? 'bg-brand-600 text-white'
                  : 'text-neutral-600 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-700'
              } ${p === '7d' ? 'rounded-l-lg' : ''} ${p === '90d' ? 'rounded-r-lg' : ''}`}
            >
              {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KPICard label="Total Patients" value={String(overview.totalPatients)} />
        <KPICard label="Active Patients" value={String(overview.activePatients)} />
        <KPICard label="Engagement Rate" value={`${overview.avgEngagementRate}%`} />
        <KPICard label="Signal Improvement" value={`${overview.avgSignalImprovement}%`} positive />
        <KPICard label="Pending Escalations" value={String(overview.pendingEscalations)} alert={overview.pendingEscalations > 0} />
        <KPICard label="Avg Response Time" value={overview.avgResponseTime} />
      </div>

      {/* Charts Row 1 */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {/* Signal Distribution Pie */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">
            Signal Band Distribution
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data.signalDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="count"
                nameKey="band"
                label={({ band, count }) => `${band}: ${count}`}
              >
                {data.signalDistribution.map((entry) => (
                  <Cell key={entry.band} fill={SIGNAL_COLORS[entry.band] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Engagement Trend */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">
            Engagement Trend
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.engagementTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="checkins" fill="#6C5CE7" name="Check-ins" radius={[2, 2, 0, 0]} />
              <Bar dataKey="journals" fill="#00B4D8" name="Journals" radius={[2, 2, 0, 0]} />
              <Bar dataKey="voice" fill="#00CEC9" name="Voice" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {/* Outcomes Trend */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">
            Clinical Outcomes Trend
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.outcomesTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 27]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="phq9Avg" stroke="#6C5CE7" strokeWidth={2} name="PHQ-9 Avg" dot={{ r: 4 }} />
              <Line type="monotone" dataKey="gad7Avg" stroke="#00B4D8" strokeWidth={2} name="GAD-7 Avg" dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-neutral-400 italic">
            Pilot target values — based on simulated demo data
          </p>
        </div>

        {/* Adherence by Category */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">
            Adherence by Category
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.adherenceByCategory} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="category" width={100} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => [`${value}%`, 'Rate']} />
              <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                {data.adherenceByCategory.map((entry, idx) => (
                  <Cell key={idx} fill={entry.rate >= 80 ? '#22c55e' : entry.rate >= 60 ? '#eab308' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ROI Panel */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Key Performance Indicators
          </h2>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            Pilot targets — not final metrics
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.topMetrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-lg border border-neutral-100 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {metric.label}
              </p>
              <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-white">
                {metric.value}
                <span className="ml-1 text-xs text-neutral-400">{metric.unit}</span>
              </p>
              <p className={`mt-1 text-xs font-medium ${metric.change > 0 ? 'text-green-600' : metric.change < 0 ? 'text-red-600' : 'text-neutral-400'}`}>
                {metric.change > 0 ? '↑' : metric.change < 0 ? '↓' : '→'} {Math.abs(metric.change)}% from previous period
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── KPI Card ────────────────────────────

function KPICard({
  label,
  value,
  positive,
  alert,
}: {
  label: string;
  value: string;
  positive?: boolean;
  alert?: boolean;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${alert ? 'text-red-600' : positive ? 'text-green-600' : 'text-neutral-900 dark:text-white'}`}>
        {value}
      </p>
    </div>
  );
}
