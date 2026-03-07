// ─── Voice Memo Page (M-08 + M-09) ──────────────────────────────────
// PRD-4: Voice upload is disabled for MVP pilot. The backend POST /voice
// returns 501. Show a "Coming Soon" page rather than a broken upload UI.

import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function VoiceMemoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Voice Memos</h1>
        <p className="mt-1 text-sm text-slate-600">
          Record a voice memo to share with your clinician
        </p>
      </div>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <Badge variant="warning">Coming Soon</Badge>
          <p className="text-sm text-amber-800">
            Voice memo recording and upload will be available in a future release.
            For now, please use the Journal or Check-in features to share updates
            with your clinician.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
