// ─── Hooks ───────────────────────────────────────────────────────────
import { useAuthStore } from '@/stores/auth';

/** Returns the current patient ID (for patient-role users, it's on the user object). */
export function usePatientId(): string | null {
  return useAuthStore((s) => s.user?.id ?? null);
}
