// ─── Signal Badge ────────────────────────────────────────────────────
import { Badge } from '@/components/ui/Badge';
import type { SignalBand } from '@/api/types';

const bandConfig: Record<SignalBand, { label: string; variant: 'success' | 'info' | 'warning' | 'danger' }> = {
  LOW: { label: 'Low', variant: 'success' },
  GUARDED: { label: 'Guarded', variant: 'info' },
  MODERATE: { label: 'Moderate', variant: 'warning' },
  ELEVATED: { label: 'Elevated', variant: 'danger' },
};

export function SignalBadge({ band, className = '' }: { band: SignalBand; className?: string }) {
  const cfg = bandConfig[band];
  return (
    <Badge variant={cfg.variant} className={className}>
      <span
        className={`mr-1 inline-block h-2 w-2 rounded-full ${
          band === 'LOW'
            ? 'bg-green-500'
            : band === 'GUARDED'
              ? 'bg-blue-500'
              : band === 'MODERATE'
                ? 'bg-amber-500'
                : 'bg-red-500'
        }`}
      />
      {cfg.label}
    </Badge>
  );
}
