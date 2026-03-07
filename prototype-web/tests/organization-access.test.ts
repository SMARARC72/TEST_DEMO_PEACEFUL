import { describe, expect, it } from 'vitest';
import {
  canModerateOrganizationMembers,
  canReviewPendingClinician,
} from '../src/lib/organization-access';
import type { OrgMember, Organization } from '../src/api/organizations';
import type { User } from '../src/api/types';

const supervisor: User = {
  id: 'user-supervisor',
  email: 'supervisor@example.com',
  firstName: 'Casey',
  lastName: 'Supervisor',
  role: 'SUPERVISOR',
  tenantId: 'tenant-001',
  status: 'ACTIVE',
  createdAt: '2026-03-06T00:00:00.000Z',
};

const admin: User = {
  id: 'user-admin',
  email: 'admin@example.com',
  firstName: 'Addison',
  lastName: 'Admin',
  role: 'ADMIN',
  tenantId: 'tenant-001',
  status: 'ACTIVE',
  createdAt: '2026-03-06T00:00:00.000Z',
};

const org: Organization = {
  id: 'org-001',
  tenantId: 'tenant-001',
  name: 'North Clinic',
  slug: 'north-clinic',
  settings: {},
  createdAt: '2026-03-06T00:00:00.000Z',
  updatedAt: '2026-03-06T00:00:00.000Z',
  role: 'OWNER',
};

const pendingClinician: OrgMember = {
  id: 'membership-001',
  orgId: 'org-001',
  userId: 'user-clinician',
  role: 'MEMBER',
  joinedAt: '2026-03-06T00:00:00.000Z',
  user: {
    id: 'user-clinician',
    firstName: 'Alex',
    lastName: 'Clinician',
    email: 'alex@example.com',
    role: 'CLINICIAN',
    status: 'SUSPENDED',
  },
};

describe('organization access helpers', () => {
  it('allows supervisor owners to moderate organization members', () => {
    expect(canModerateOrganizationMembers(supervisor, org)).toBe(true);
  });

  it('allows platform admins to moderate pending clinicians without org membership context', () => {
    expect(canModerateOrganizationMembers(admin, undefined)).toBe(true);
  });

  it('only exposes pending clinician review actions for suspended clinicians', () => {
    expect(canReviewPendingClinician(supervisor, org, pendingClinician)).toBe(true);

    expect(
      canReviewPendingClinician(supervisor, org, {
        ...pendingClinician,
        user: { ...pendingClinician.user, status: 'ACTIVE' },
      }),
    ).toBe(false);

    expect(
      canReviewPendingClinician(supervisor, org, {
        ...pendingClinician,
        user: { ...pendingClinician.user, role: 'PATIENT' },
      }),
    ).toBe(false);
  });
});
