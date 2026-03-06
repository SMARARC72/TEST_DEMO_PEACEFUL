import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { clinicianApi } from '@/api/clinician';
import type {
  ChatSessionDetail,
  ChatSessionListItem,
  ChatSummaryDetail,
  ChatSummaryListItem,
  ChatSummaryRecommendation,
  ChatSummaryStatus,
} from '@/api/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Textarea } from '@/components/ui/Textarea';
import { useUIStore } from '@/stores/ui';

const statusVariant: Record<ChatSummaryStatus, 'default' | 'warning' | 'success' | 'danger' | 'info'> = {
  DRAFT: 'warning',
  REVIEWED: 'info',
  APPROVED: 'success',
  REJECTED: 'danger',
  ESCALATED: 'danger',
};

function formatRole(role: string) {
  if (role === 'USER') return 'Patient';
  if (role === 'ASSISTANT') return 'AI Companion';
  return role;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function normalizeRecommendations(value: ChatSummaryDetail['recommendations']) {
  return Array.isArray(value) ? value : [];
}

export default function ChatReviewPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const addToast = useUIStore((s) => s.addToast);

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<ChatSessionListItem[]>([]);
  const [summaries, setSummaries] = useState<ChatSummaryListItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSummaryId, setSelectedSummaryId] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] = useState<ChatSessionDetail | null>(null);
  const [summaryDetail, setSummaryDetail] = useState<ChatSummaryDetail | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [busySessionId, setBusySessionId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<Extract<ChatSummaryStatus, 'APPROVED' | 'REJECTED' | 'ESCALATED'> | null>(null);

  async function loadOverview(preferredSummaryId?: string | null) {
    if (!patientId) return;
    const [[nextSessions, sessionsErr], [nextSummaries, summariesErr]] = await Promise.all([
      clinicianApi.getChatSessions(patientId),
      clinicianApi.getChatSummaries(patientId),
    ]);

    if (sessionsErr || summariesErr) {
      addToast({
        title: 'Failed to load chat review',
        description: sessionsErr?.message ?? summariesErr?.message,
        variant: 'error',
      });
      setLoading(false);
      return;
    }

    const resolvedSessions = nextSessions ?? [];
    const resolvedSummaries = nextSummaries ?? [];
    setSessions(resolvedSessions);
    setSummaries(resolvedSummaries);

    const nextSummaryId = preferredSummaryId
      ?? selectedSummaryId
      ?? resolvedSummaries[0]?.id
      ?? null;

    if (nextSummaryId) {
      await loadSummary(nextSummaryId, false);
    } else {
      setSelectedSummaryId(null);
      setSummaryDetail(null);
      setReviewNotes('');
    }

    setLoading(false);
  }

  async function loadTranscript(sessionId: string) {
    if (!patientId) return;
    setBusySessionId(sessionId);
    const [data, err] = await clinicianApi.getChatSession(patientId, sessionId);
    setBusySessionId(null);
    if (err) {
      addToast({ title: 'Failed to load transcript', description: err.message, variant: 'error' });
      return;
    }
    setSelectedSessionId(sessionId);
    setSessionDetail(data ?? null);
  }

  async function loadSummary(summaryId: string, syncSelection = true) {
    if (!patientId) return;
    if (syncSelection) setBusySessionId(summaryId);
    const [data, err] = await clinicianApi.getChatSummary(patientId, summaryId);
    if (syncSelection) setBusySessionId(null);
    if (err) {
      addToast({ title: 'Failed to load summary', description: err.message, variant: 'error' });
      return;
    }
    setSelectedSummaryId(summaryId);
    setSummaryDetail(data ?? null);
    setReviewNotes(data?.reviewNotes ?? '');
  }

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    (async () => {
      await loadOverview();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  async function handleGenerateSummary(sessionId: string) {
    if (!patientId) return;
    setBusySessionId(sessionId);
    const [created, err] = await clinicianApi.summarizeChatSession(patientId, sessionId);
    setBusySessionId(null);
    if (err) {
      addToast({ title: 'Failed to generate summary', description: err.message, variant: 'error' });
      return;
    }
    addToast({ title: 'Clinical summary generated', variant: 'success' });
    await loadOverview(created?.id ?? null);
  }

  async function handleReview(action: Extract<ChatSummaryStatus, 'APPROVED' | 'REJECTED' | 'ESCALATED'>) {
    if (!patientId || !selectedSummaryId) return;
    setReviewAction(action);
    const [updated, err] = await clinicianApi.reviewChatSummary(patientId, selectedSummaryId, {
      action,
      notes: reviewNotes.trim() || undefined,
    });
    setReviewAction(null);
    if (err) {
      addToast({ title: 'Failed to update summary', description: err.message, variant: 'error' });
      return;
    }

    setSummaryDetail((current) => current
      ? {
          ...current,
          status: updated?.status ?? action,
          reviewedAt: updated?.reviewedAt ?? current.reviewedAt,
          reviewNotes,
        }
      : current);
    setSummaries((current) => current.map((item) => (
      item.id === selectedSummaryId
        ? { ...item, status: updated?.status ?? action, reviewedAt: updated?.reviewedAt ?? item.reviewedAt }
        : item
    )));
    addToast({ title: `Summary ${action.toLowerCase()}`, variant: action === 'APPROVED' ? 'success' : 'warning' });
  }

  const recommendations = normalizeRecommendations(summaryDetail?.recommendations ?? []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Chat Review</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Review AI companion transcripts and clinician-only chat summaries.
          </p>
        </div>
        <Link to={patientId ? `/clinician/patients/${patientId}` : '/clinician/caseload'}>
          <Button variant="ghost" size="sm">← Back to patient</Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Chat Sessions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sessions.length === 0 ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">No chat sessions recorded for this patient.</p>
              ) : sessions.map((session) => (
                <div
                  key={session.id}
                  className={`rounded-xl border p-4 ${selectedSessionId === session.id ? 'border-brand-400 bg-brand-50/50 dark:border-brand-500 dark:bg-brand-950/20' : 'border-neutral-200 dark:border-neutral-700'}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-neutral-900 dark:text-white">Session {session.id.slice(0, 8)}</p>
                        <Badge variant={session.active ? 'success' : 'default'}>
                          {session.active ? 'Active' : 'Closed'}
                        </Badge>
                        {session.latestSummary ? (
                          <Badge variant={statusVariant[session.latestSummary.status]}>
                            Latest summary: {session.latestSummary.status}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {session.messageCount} messages • {session.durationMinutes} min • Updated {formatDate(session.updatedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        loading={busySessionId === session.id && selectedSessionId !== session.id}
                        onClick={() => loadTranscript(session.id)}
                      >
                        View Transcript
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        loading={busySessionId === session.id && selectedSessionId === session.id}
                        onClick={() => handleGenerateSummary(session.id)}
                      >
                        Generate Summary
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transcript</CardTitle>
            </CardHeader>
            <CardContent>
              {!sessionDetail ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Select a session to review the transcript.</p>
              ) : sessionDetail.messages.length === 0 ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">This session does not contain any messages.</p>
              ) : (
                <div className="space-y-3">
                  {sessionDetail.messages.map((message) => (
                    <div key={message.id} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <Badge variant={message.role === 'USER' ? 'brand' : message.role === 'ASSISTANT' ? 'info' : 'default'}>
                          {formatRole(message.role)}
                        </Badge>
                        <span className="text-xs text-neutral-400">{formatDate(message.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-200">{message.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Clinical AI Summaries</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {summaries.length === 0 ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">No clinician summaries generated yet.</p>
              ) : summaries.map((summary) => (
                <button
                  key={summary.id}
                  type="button"
                  onClick={() => loadSummary(summary.id)}
                  className={`w-full rounded-xl border p-4 text-left transition ${selectedSummaryId === summary.id ? 'border-brand-400 bg-brand-50/50 dark:border-brand-500 dark:bg-brand-950/20' : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-white">Summary {summary.id.slice(0, 8)}</p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        Session started {new Date(summary.sessionCreatedAt).toLocaleDateString()} • Generated {new Date(summary.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={statusVariant[summary.status]}>{summary.status}</Badge>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Summary Detail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {!summaryDetail ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Select a summary to review clinician-facing analysis.</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant[summaryDetail.status]}>{summaryDetail.status}</Badge>
                    <Badge variant="default">{summaryDetail.session.messageCount} messages</Badge>
                    <span className="text-xs text-neutral-400">Model: {summaryDetail.modelVersion}</span>
                  </div>

                  <div>
                    <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Clinical Summary</h2>
                    <p className="whitespace-pre-wrap rounded-xl border border-neutral-200 p-4 text-sm text-neutral-700 dark:border-neutral-700 dark:text-neutral-200">
                      {summaryDetail.clinicianSummary}
                    </p>
                  </div>

                  <div>
                    <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Recommendations</h2>
                    {recommendations.length === 0 ? (
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">No structured recommendations were returned for this summary.</p>
                    ) : (
                      <div className="space-y-3">
                        {recommendations.map((recommendation: ChatSummaryRecommendation, index) => (
                          <div key={`${recommendation.title ?? 'rec'}-${index}`} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <p className="font-medium text-neutral-900 dark:text-white">{recommendation.title ?? `Recommendation ${index + 1}`}</p>
                              {recommendation.signalBand ? (
                                <Badge variant="warning">{recommendation.signalBand}</Badge>
                              ) : null}
                              {recommendation.category ? (
                                <Badge variant="default">{recommendation.category}</Badge>
                              ) : null}
                            </div>
                            {recommendation.description ? (
                              <p className="text-sm text-neutral-700 dark:text-neutral-200">{recommendation.description}</p>
                            ) : null}
                            {recommendation.reasoning ? (
                              <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{recommendation.reasoning}</p>
                            ) : null}
                            {recommendation.evidenceCitations?.length ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {recommendation.evidenceCitations.map((citation) => (
                                  <Badge key={citation} variant="info">{citation}</Badge>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <Textarea
                      label="Review Notes"
                      placeholder="Record clinician rationale before approving, rejecting, or escalating this summary."
                      value={reviewNotes}
                      onChange={(event) => setReviewNotes(event.target.value)}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      loading={reviewAction === 'APPROVED'}
                      disabled={summaryDetail.status === 'APPROVED'}
                      onClick={() => handleReview('APPROVED')}
                    >
                      Approve Summary
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      loading={reviewAction === 'REJECTED'}
                      disabled={summaryDetail.status === 'REJECTED'}
                      onClick={() => handleReview('REJECTED')}
                    >
                      Reject Summary
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      loading={reviewAction === 'ESCALATED'}
                      disabled={summaryDetail.status === 'ESCALATED'}
                      onClick={() => handleReview('ESCALATED')}
                    >
                      Escalate Summary
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}