// ─── Tenant Selector ──────────────────────────────────────────────────
// Shown before the login page when no tenant is resolved from URL.
// User picks their organization, then proceeds to login.

import { useTenantStore, type Tenant } from '@/stores/tenant';
import { useNavigate } from 'react-router';
import { Spinner } from '@/components/ui/Spinner';

const DEMO_TENANTS: Tenant[] = [
  { id: 'tenant-001', slug: 'demo-clinic', name: 'Demo Clinic', primaryColor: '#6C5CE7' },
  { id: 'tenant-002', slug: 'wellness-center', name: 'Wellness Center', primaryColor: '#00B4D8' },
  { id: 'tenant-003', slug: 'behavioral-health', name: 'Behavioral Health Associates', primaryColor: '#10B981' },
];

export function TenantSelector() {
  const { setTenant, isLoading } = useTenantStore();
  const navigate = useNavigate();

  function handleSelect(tenant: Tenant) {
    setTenant(tenant);
    navigate('/login');
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4 dark:bg-neutral-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 mb-4" />
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Welcome to Peacefull
          </h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            Select your organization to continue
          </p>
        </div>

        <div className="space-y-3">
          {DEMO_TENANTS.map((tenant) => (
            <button
              key={tenant.id}
              onClick={() => handleSelect(tenant)}
              className="w-full flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4 text-left transition-all hover:border-brand-300 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-brand-600"
            >
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: tenant.primaryColor }}
              >
                {tenant.name.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">
                  {tenant.name}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {tenant.slug}.peacefull.ai
                </p>
              </div>
              <svg className="ml-auto h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
