// ─── Patient Profile Page (C-05) ─────────────────────────────────────
// Clinician view of a patient — recent activity, signal history, drafts,
// demographics, medications, allergies, and problem list (ICD-10).
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { clinicianApi } from '@/api/clinician';
import { patientApi } from '@/api/patients';
import { useUIStore } from '@/stores/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { SignalBadge } from '@/components/domain/SignalBadge';
import type { PatientProfile, PatientDemographics, Medication, Allergy, Diagnosis, EmergencyContact } from '@/api/types';

type ProfileTab = 'overview' | 'demographics' | 'medications' | 'allergies' | 'problems';

export default function PatientProfilePage() {
  const { patientId } = useParams<{ patientId: string }>();
  const addToast = useUIStore((s) => s.addToast);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [demographics, setDemographics] = useState<PatientDemographics | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    (async () => {
      const [data, err] = await clinicianApi.getPatientProfile(patientId);
      if (cancelled) return;
      if (err) addToast({ title: 'Failed to load patient profile', variant: 'error' });
      if (data) setProfile(data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  // Load clinical data when switching to those tabs
  useEffect(() => {
    if (!patientId) return;
    if (activeTab === 'demographics' && !demographics) {
      (async () => {
        const [d] = await patientApi.getDemographics(patientId);
        if (d) setDemographics(d);
        const [ec] = await patientApi.getEmergencyContacts(patientId);
        if (ec) setEmergencyContacts(ec);
      })();
    }
    if (activeTab === 'medications' && medications.length === 0) {
      (async () => {
        const [m] = await patientApi.getMedications(patientId);
        if (m) setMedications(m);
      })();
    }
    if (activeTab === 'allergies' && allergies.length === 0) {
      (async () => {
        const [a] = await patientApi.getAllergies(patientId);
        if (a) setAllergies(a);
      })();
    }
    if (activeTab === 'problems' && diagnoses.length === 0) {
      (async () => {
        const [dx] = await patientApi.getDiagnoses(patientId);
        if (dx) setDiagnoses(dx);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, patientId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <Card><CardContent className="py-8 text-center text-sm text-neutral-500">Patient not found.</CardContent></Card>
        <Link to="/clinician/caseload"><Button variant="ghost" size="sm">← Back</Button></Link>
      </div>
    );
  }

  const patient = profile.patient ?? { firstName: 'Unknown', lastName: 'Patient', id: '', diagnosisPrimary: null, signalBand: null, submissionCount: 0 };
  const recentCheckins = profile.recentCheckins ?? [];
  const recentJournals = profile.recentJournals ?? [];
  const triageItems = profile.triageItems ?? [];
  const drafts = profile.drafts ?? [];
  const signalHistory = profile.signalHistory ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {patient.firstName} {patient.lastName}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {patient.diagnosisPrimary ?? 'No primary diagnosis'} • ID: {patient.id.slice(0, 8)}
          </p>
        </div>
        <Link to="/clinician/caseload">
          <Button variant="ghost" size="sm">← Back</Button>
        </Link>
      </div>

      {/* Quick stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Signal', value: patient.signalBand ?? 'N/A', icon: '📡' },
          { label: 'Submissions', value: patient.submissionCount ?? 0, icon: '📄' },
          { label: 'Open Alerts', value: triageItems.filter((t) => t.status === 'NEW').length, icon: '🔔' },
          { label: 'Pending Drafts', value: drafts.filter((d) => d.status === 'DRAFT').length, icon: '📝' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">{stat.icon}</span>
              <div>
                <p className="text-xl font-bold text-neutral-900 dark:text-white">{stat.value}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Signal History */}
      {signalHistory.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Signal History</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2 overflow-x-auto">
              {signalHistory.map((s, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <SignalBadge band={s.band as 'LOW' | 'GUARDED' | 'MODERATE' | 'ELEVATED'} />
                  <span className="text-xs text-neutral-400">{new Date(s.date).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clinical Data Tabs */}
      <div className="flex gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-700 dark:bg-neutral-800">
        {([
          { key: 'overview' as const, label: 'Overview' },
          { key: 'demographics' as const, label: 'Demographics' },
          { key: 'medications' as const, label: 'Medications' },
          { key: 'allergies' as const, label: 'Allergies' },
          { key: 'problems' as const, label: 'Problem List' },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-white text-brand-700 shadow-sm dark:bg-neutral-700 dark:text-brand-300'
                : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Demographics Tab */}
      {activeTab === 'demographics' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Patient Demographics</CardTitle></CardHeader>
            <CardContent>
              {demographics ? (
                <dl className="space-y-3">
                  {([
                    ['Date of Birth', demographics.dateOfBirth],
                    ['Gender', demographics.gender],
                    ['Pronouns', demographics.pronouns],
                    ['Race', demographics.race],
                    ['Ethnicity', demographics.ethnicity],
                    ['Language', demographics.primaryLanguage],
                    ['Insurance', demographics.insurance?.plan],
                    ['Member ID', demographics.insurance?.memberId],
                  ] as const).map(([label, value]) => (
                    <div key={label} className="flex justify-between border-b border-neutral-100 pb-2 dark:border-neutral-700">
                      <dt className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{label}</dt>
                      <dd className="text-sm text-neutral-900 dark:text-white">{value ?? '—'}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <div className="flex justify-center py-4"><Spinner /></div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Emergency Contacts</CardTitle></CardHeader>
            <CardContent>
              {emergencyContacts.length > 0 ? (
                <div className="space-y-3">
                  {emergencyContacts.map((ec) => (
                    <div key={ec.id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                      <p className="font-medium text-neutral-900 dark:text-white">{ec.name}</p>
                      <p className="text-sm text-neutral-500">{ec.relationship} &middot; <a href={`tel:${ec.phone}`} className="text-brand-600 hover:underline">{ec.phone}</a></p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-400">No emergency contacts on file.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Medications Tab */}
      {activeTab === 'medications' && (
        <Card>
          <CardHeader><CardTitle>Active Medications</CardTitle></CardHeader>
          <CardContent>
            {medications.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-700">
                      <th className="pb-2 text-left font-semibold text-neutral-500">Medication</th>
                      <th className="pb-2 text-left font-semibold text-neutral-500">Dose</th>
                      <th className="pb-2 text-left font-semibold text-neutral-500">Frequency</th>
                      <th className="pb-2 text-left font-semibold text-neutral-500">Prescriber</th>
                      <th className="pb-2 text-left font-semibold text-neutral-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                    {medications.map((med) => (
                      <tr key={med.id}>
                        <td className="py-2 font-medium text-neutral-900 dark:text-white">{med.name}</td>
                        <td className="py-2 text-neutral-600 dark:text-neutral-300">{med.dose}</td>
                        <td className="py-2 text-neutral-600 dark:text-neutral-300">{med.frequency}</td>
                        <td className="py-2 text-neutral-600 dark:text-neutral-300">{med.prescriber}</td>
                        <td className="py-2">
                          <Badge variant={med.status === 'ACTIVE' ? 'success' : 'default'}>
                            {med.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-neutral-400">No medications on file.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Allergies Tab */}
      {activeTab === 'allergies' && (
        <Card>
          <CardHeader><CardTitle>Allergies</CardTitle></CardHeader>
          <CardContent>
            {allergies.length > 0 ? (
              <div className="space-y-3">
                {allergies.map((a) => {
                  const sevColors: Record<string, string> = {
                    mild: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300',
                    moderate: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300',
                    severe: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300',
                    'life-threatening': 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300',
                  };
                  return (
                    <div key={a.id} className="flex items-start justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-white">{a.allergen}</p>
                        <p className="text-sm text-neutral-500">{a.reaction}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${sevColors[a.severity] ?? ''}`}>
                        {a.severity}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-neutral-400">No known allergies.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Problem List (ICD-10) Tab */}
      {activeTab === 'problems' && (
        <Card>
          <CardHeader><CardTitle>Problem List (ICD-10)</CardTitle></CardHeader>
          <CardContent>
            {diagnoses.length > 0 ? (
              <div className="space-y-3">
                {diagnoses.map((dx) => (
                  <div key={dx.id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">{dx.description}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        ICD-10: <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-700">{dx.icd10Code}</code>
                        {dx.diagnosedDate && ` · Onset: ${new Date(dx.diagnosedDate).toLocaleDateString()}`}
                      </p>
                    </div>
                    <Badge variant={dx.status === 'ACTIVE' ? 'danger' : dx.status === 'RESOLVED' ? 'success' : 'default'}>
                      {dx.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-400">No diagnoses on file.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick-link panels (Overview tab) */}
      {activeTab === 'overview' && (<>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link to={`/clinician/patients/${patientId}/drafts`}>
          <Card className="transition-shadow hover:shadow-md cursor-pointer">
            <CardContent className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">📋</span>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">AI Drafts</p>
                <p className="text-xs text-neutral-500">{drafts.length} drafts</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to={`/clinician/patients/${patientId}/chat-review`}>
          <Card className="transition-shadow hover:shadow-md cursor-pointer">
            <CardContent className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">💬</span>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">Chat Review</p>
                <p className="text-xs text-neutral-500">Transcripts & AI summaries</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to={`/clinician/patients/${patientId}/memories`}>
          <Card className="transition-shadow hover:shadow-md cursor-pointer">
            <CardContent className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">🧠</span>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">Memory Review</p>
                <p className="text-xs text-neutral-500">Proposed memories</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to={`/clinician/patients/${patientId}/plans`}>
          <Card className="transition-shadow hover:shadow-md cursor-pointer">
            <CardContent className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">📊</span>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">Treatment Plan</p>
                <p className="text-xs text-neutral-500">Goals & interventions</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to={`/clinician/patients/${patientId}/recommendations`}>
          <Card className="transition-shadow hover:shadow-md cursor-pointer">
            <CardContent className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">💡</span>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">Recommendations</p>
                <p className="text-xs text-neutral-500">Generated & suppressed</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to={`/clinician/patients/${patientId}/restricted-notes`}>
          <Card className="transition-shadow hover:shadow-md cursor-pointer">
            <CardContent className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">🔒</span>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">Restricted Notes</p>
                <p className="text-xs text-neutral-500">Special handling</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to={`/clinician/patients/${patientId}/exports`}>
          <Card className="transition-shadow hover:shadow-md cursor-pointer">
            <CardContent className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">📦</span>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">Exports Center</p>
                <p className="text-xs text-neutral-500">Export patient data</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Check-ins */}
      {activeTab === 'overview' && recentCheckins.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent Check-ins</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentCheckins.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                  <div className="flex gap-4 text-sm">
                    <span>Mood: <strong>{c.mood}</strong></span>
                    <span>Stress: <strong>{c.stress}</strong></span>
                    <span>Sleep: <strong>{c.sleep}</strong></span>
                    <span>Focus: <strong>{c.focus}</strong></span>
                  </div>
                  <span className="text-xs text-neutral-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Journal Entries */}
      {activeTab === 'overview' && recentJournals.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent Journal Entries</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentJournals.slice(0, 3).map((j) => (
                <div key={j.id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                  <p className="line-clamp-2 text-sm text-neutral-700 dark:text-neutral-300">{j.content}</p>
                  <p className="mt-1 text-xs text-neutral-400">{new Date(j.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Alerts */}
      {activeTab === 'overview' && triageItems.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Active Alerts</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {triageItems.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                  <div className="flex items-center gap-2">
                    <SignalBadge band={t.signalBand} />
                    <Badge variant={t.status === 'NEW' ? 'danger' : t.status === 'RESOLVED' ? 'success' : 'warning'}>
                      {t.status}
                    </Badge>
                    <span className="text-sm text-neutral-700 dark:text-neutral-300 line-clamp-1">{t.summary}</span>
                  </div>
                  <Link to={`/clinician/triage/${t.id}`}>
                    <Button variant="ghost" size="sm">View</Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      </>)}
    </div>
  );
}
