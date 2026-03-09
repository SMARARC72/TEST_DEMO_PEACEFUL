import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '@/stores/auth';

export function PublicRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  if (isAuthenticated && user) {
    const destination = user.role === 'PATIENT' ? '/patient' : '/clinician';
    return <Navigate to={destination} replace />;
  }

  return <Outlet />;
}