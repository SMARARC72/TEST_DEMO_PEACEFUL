// ─── Resources Page (M-11) ───────────────────────────────────────────
// Crisis support resources, 988/911 CTAs, safety plan link, and
// coping skills grid. Always-available regardless of API status.

import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import { patientApi } from '@/api/patients';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import type { CrisisResource } from '@/api/types';

// Always-available crisis contacts (never depend on API)
const CRISIS_CONTACTS = [
  {
    name: '988 Suicide & Crisis Lifeline',
    description: 'Free, confidential support 24/7 for people in distress.',
    phone: '988',
    action: 'Call or Text',
    urgent: true,
  },
  {
    name: 'Crisis Text Line',
    description: 'Text-based crisis support for anyone in crisis.',
    phone: '741741',
    action: 'Text HOME',
    urgent: true,
  },
  {
    name: 'Emergency Services',
    description: 'For life-threatening emergencies.',
    phone: '911',
    action: 'Call',
    urgent: true,
  },
  {
    name: 'SAMHSA National Helpline',
    description: 'Free referral service for substance abuse and mental health.',
    phone: '1-800-662-4357',
    action: 'Call',
    urgent: false,
  },
];

const COPING_SKILLS = [
  { icon: '🫁', name: 'Deep Breathing', description: 'Try the 4-7-8 technique: inhale 4s, hold 7s, exhale 8s.' },
  { icon: '🧘', name: 'Grounding (5-4-3-2-1)', description: 'Name 5 things you see, 4 you feel, 3 you hear, 2 you smell, 1 you taste.' },
  { icon: '🚶', name: 'Movement', description: 'Take a short walk, stretch, or do light exercise.' },
  { icon: '📝', name: 'Journaling', description: 'Write about your thoughts and feelings. No editing needed.' },
  { icon: '🎵', name: 'Music', description: 'Listen to calming music or a favorite playlist.' },
  { icon: '📱', name: 'Reach Out', description: 'Call or text someone you trust. Connection helps.' },
  { icon: '💧', name: 'Self-Care Basics', description: 'Drink water, eat something, rest if you can.' },
  { icon: '🌿', name: 'Nature', description: 'Step outside briefly. Fresh air and sunlight can help reset.' },
];

export default function ResourcesPage() {
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);
  const patientId = user?.id ?? '';

  const [resources, setResources] = useState<CrisisResource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    (async () => {
      try {
        const [data, err] = await patientApi.getResources(patientId);
        if (!cancelled && err) addToast({ title: 'Additional resources unavailable', variant: 'info' });
        if (!cancelled && data) setResources(data);
      } catch {
        // API resources are optional — crisis contacts always show
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [patientId, addToast]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Resources</h1>
        <p className="mt-1 text-sm text-slate-600">
          Crisis support, coping strategies, and helpful resources
        </p>
      </div>

      {/* Crisis Support */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-red-700">
          <span aria-hidden="true">🚨</span> Crisis Support
        </h2>
        <div className="space-y-3">
          {CRISIS_CONTACTS.map((contact) => (
            <Card
              key={contact.name}
              className={contact.urgent ? 'border-red-200 bg-red-50' : ''}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold text-slate-800">{contact.name}</p>
                  <p className="text-sm text-slate-600">{contact.description}</p>
                </div>
                <a
                  href={`tel:${contact.phone.replace(/[^0-9]/g, '')}`}
                  className="shrink-0"
                  aria-label={`${contact.action} ${contact.phone}`}
                >
                  <Button
                    variant={contact.urgent ? 'danger' : 'outline'}
                    size="sm"
                  >
                    {contact.action}: {contact.phone}
                  </Button>
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Safety Plan Quick Link */}
      <Card className="border-brand-200 bg-brand-50">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="font-semibold text-brand-800">Your Safety Plan</p>
            <p className="text-sm text-brand-700">
              Review your personalized safety plan steps
            </p>
          </div>
          <Link to="/patient/safety-plan">
            <Button variant="outline" size="sm">
              View Plan →
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Coping Skills Grid */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-700">
          <span aria-hidden="true">🧰</span> Coping Strategies
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {COPING_SKILLS.map((skill) => (
            <Card key={skill.name} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden="true">{skill.icon}</span>
                  <div>
                    <p className="font-medium text-slate-800">{skill.name}</p>
                    <p className="text-sm text-slate-600">{skill.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Additional Resources from API */}
      {loading ? (
        <div className="flex h-20 items-center justify-center">
          <Spinner />
        </div>
      ) : resources.length > 0 ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-700">
            Additional Resources
          </h2>
          <div className="space-y-3">
            {resources.map((res) => (
              <Card key={res.id}>
                <CardContent className="p-4">
                  <p className="font-medium text-slate-800">{res.name}</p>
                  <p className="text-sm text-slate-600">{res.description}</p>
                  {res.url && (
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-sm text-brand-600 hover:underline"
                    >
                      Learn more →
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
