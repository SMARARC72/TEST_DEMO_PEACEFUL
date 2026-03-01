// ─── App Shell ───────────────────────────────────────────────────────
// Shared layout with responsive sidebar + top bar for authenticated views.

import { Outlet, Link, useLocation } from 'react-router';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';

export function AppShell() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const location = useLocation();

  // HIPAA: auto-logout after 15 min idle
  useIdleTimeout();

  const role = user?.role ?? 'PATIENT';
  const isPatient = role === 'PATIENT';
  const navItems = isPatient ? patientNav : clinicianNav;

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 transform border-r border-neutral-200 bg-white
          transition-transform duration-200 ease-in-out
          dark:border-neutral-700 dark:bg-neutral-800
          lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `.trim()}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-neutral-200 px-5 dark:border-neutral-700">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600" />
          <span className="text-lg font-bold text-neutral-900 dark:text-white">Peacefull</span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 p-3">
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => useUIStore.getState().setSidebar(false)}
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
                  ${
                    active
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                      : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700'
                  }
                `.trim()}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={toggleSidebar}
          onKeyDown={(e) => e.key === 'Escape' && toggleSidebar()}
          role="presentation"
        />
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-4 dark:border-neutral-700 dark:bg-neutral-800">
          <button
            onClick={toggleSidebar}
            className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100 lg:hidden dark:hover:bg-neutral-700"
            aria-label="Toggle menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-3 ml-auto">
            <span className="text-sm text-neutral-600 dark:text-neutral-300">
              {user?.profile.firstName} {user?.profile.lastName}
            </span>
            <button
              onClick={() => logout()}
              className="rounded-md px-3 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// ─── Nav items ────────────────────────────────

const patientNav = [
  { to: '/patient', label: 'Home', icon: '🏠' },
  { to: '/patient/checkin', label: 'Check-in', icon: '✅' },
  { to: '/patient/journal', label: 'Journal', icon: '📝' },
  { to: '/patient/voice', label: 'Voice Memo', icon: '🎙️' },
  { to: '/patient/safety-plan', label: 'Safety Plan', icon: '🛡️' },
  { to: '/patient/resources', label: 'Resources', icon: '📚' },
  { to: '/patient/settings', label: 'Settings', icon: '⚙️' },
];

const clinicianNav = [
  { to: '/clinician', label: 'Dashboard', icon: '📊' },
  { to: '/clinician/caseload', label: 'Caseload', icon: '👥' },
  { to: '/clinician/triage', label: 'Triage Inbox', icon: '🔔' },
];
