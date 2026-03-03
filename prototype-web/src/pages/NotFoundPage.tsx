// ─── 404 Not Found Page ──────────────────────────────────────────────
import { Link } from 'react-router';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/Button';

export default function NotFoundPage() {
  const user = useAuthStore((s) => s.user);
  const homePath = user
    ? user.role === 'PATIENT'
      ? '/patient'
      : '/clinician'
    : '/login';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-900">
      <div className="text-center">
        <p className="text-7xl font-bold text-brand-500">404</p>
        <h1 className="mt-4 text-2xl font-bold text-neutral-900 dark:text-white">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to={homePath}>
            <Button variant="primary">
              {user ? 'Go to Dashboard' : 'Go to Login'}
            </Button>
          </Link>
          <Button variant="ghost" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
