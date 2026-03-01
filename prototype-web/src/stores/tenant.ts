// ─── Multi-Tenant Store ──────────────────────────────────────────────
// Resolves the current tenant from URL slug or a selector, persists
// the tenant ID, and injects it as an X-Tenant-ID header on all API calls.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  logoUrl?: string;
  primaryColor?: string;
}

interface TenantState {
  tenant: Tenant | null;
  tenants: Tenant[];
  isLoading: boolean;
  setTenant: (tenant: Tenant) => void;
  setTenants: (tenants: Tenant[]) => void;
  clearTenant: () => void;
  /** Resolve tenant from URL slug or fallback */
  resolveFromSlug: (slug: string) => Tenant | null;
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set, get) => ({
      tenant: null,
      tenants: [],
      isLoading: false,

      setTenant: (tenant) => set({ tenant }),
      setTenants: (tenants) => set({ tenants }),
      clearTenant: () => set({ tenant: null }),

      resolveFromSlug: (slug) => {
        const match = get().tenants.find((t) => t.slug === slug);
        if (match) set({ tenant: match });
        return match ?? null;
      },
    }),
    {
      name: 'peacefull-tenant',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ tenant: s.tenant }),
    },
  ),
);

/**
 * Extracts tenant slug from the current URL.
 * Supports two patterns:
 *   1. Subdomain: `acme.peacefull.ai` → slug = 'acme'
 *   2. Path prefix: `peacefull.ai/t/acme/login` → slug = 'acme'
 */
export function extractTenantSlug(): string | null {
  if (typeof window === 'undefined') return null;

  // Path-based: /t/:slug/...
  const pathMatch = window.location.pathname.match(/^\/t\/([a-zA-Z0-9_-]+)/);
  if (pathMatch) return pathMatch[1];

  // Subdomain-based
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    const sub = parts[0];
    // Exclude common non-tenant subdomains
    if (!['www', 'app', 'api', 'localhost'].includes(sub)) {
      return sub;
    }
  }

  return null;
}

/**
 * Returns the current tenant ID for use in API headers / request context.
 */
export function getCurrentTenantId(): string | null {
  return useTenantStore.getState().tenant?.id ?? null;
}
