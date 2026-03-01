// ─── Auth Guard ──────────────────────────────────────────────────────
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuthStore } from '@/stores/auth';
import type { UserRole } from '@/api/types';

interface AuthGuardProps {
  allowedRoles?: UserRole[];
}

export function AuthGuard({ allowedRoles }: AuthGuardProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Block access if role is unknown or not in allowedRoles
  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    if (!role) {
      return <Navigate to="/login" replace />;
    }
    const home = role === 'PATIENT' ? '/patient' : '/clinician';
    return <Navigate to={home} replace />;
  }

  return <Outlet />;
}
