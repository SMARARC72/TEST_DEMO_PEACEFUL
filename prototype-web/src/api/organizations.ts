// ─── Organization API ────────────────────────────────────────────────
import { apiGet, apiPost, apiPatch, apiDelete } from './client';

export interface Organization {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  npi?: string;
  phone?: string;
  website?: string;
  logoUrl?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  role?: string;       // present when listing user's orgs
  joinedAt?: string;   // present when listing user's orgs
  _count?: { memberships: number };
}

export interface OrgMember {
  id: string;
  orgId: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'BILLING';
  joinedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    status: string;
    lastLogin?: string;
  };
}

export interface OrgInvitation {
  id: string;
  orgId: string;
  email: string;
  role: string;
  token: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  expiresAt: string;
  createdAt: string;
  inviter: { firstName: string; lastName: string };
}

export interface InviteValidation {
  email: string;
  role: string;
  organizationName: string;
  organizationSlug: string;
  inviterName: string;
  expiresAt: string;
}

export const organizationApi = {
  /** List current user's organizations */
  listOrganizations() {
    return apiGet<{ organizations: Organization[] }>('organizations');
  },

  /** Create a new organization / practice */
  createOrganization(data: {
    name: string;
    npi?: string;
    taxId?: string;
    address?: Organization['address'];
    phone?: string;
    website?: string;
  }) {
    return apiPost<Organization>('organizations', data);
  },

  /** Get organization details with members */
  getOrganization(orgId: string) {
    return apiGet<Organization & { memberships: OrgMember[] }>(`organizations/${orgId}`);
  },

  /** Update organization details */
  updateOrganization(orgId: string, data: Partial<Pick<Organization, 'name' | 'npi' | 'phone' | 'website' | 'address' | 'logoUrl'>>) {
    return apiPatch<Organization>(`organizations/${orgId}`, data);
  },

  /** List organization members */
  listMembers(orgId: string) {
    return apiGet<{ members: OrgMember[] }>(`organizations/${orgId}/members`);
  },

  /** Remove a member from the organization */
  removeMember(orgId: string, userId: string) {
    return apiDelete(`organizations/${orgId}/members/${userId}`);
  },

  /** Approve a suspended organization member */
  approveMember(orgId: string, userId: string) {
    return apiPatch<{ message: string; userId: string }>(
      `organizations/${orgId}/members/${userId}/approve`,
      {},
    );
  },

  /** Reject a suspended organization member */
  rejectMember(orgId: string, userId: string) {
    return apiPatch<{ message: string; userId: string }>(
      `organizations/${orgId}/members/${userId}/reject`,
      {},
    );
  },

  /** Send an invitation */
  sendInvitation(orgId: string, data: { email: string; role?: string }) {
    return apiPost<{ invitation: OrgInvitation }>(`organizations/${orgId}/invite`, data);
  },

  /** List pending invitations */
  listInvitations(orgId: string) {
    return apiGet<{ invitations: OrgInvitation[] }>(`organizations/${orgId}/invitations`);
  },

  /** Revoke an invitation */
  revokeInvitation(orgId: string, inviteId: string) {
    return apiDelete(`organizations/${orgId}/invitations/${inviteId}`);
  },

  /** Validate an invitation token (public — no auth required) */
  validateInvite(token: string) {
    return apiGet<InviteValidation>(`organizations/invitations/${token}`);
  },

  /** Accept an invitation (public — no auth required) */
  acceptInvite(token: string, data: { firstName: string; lastName: string; password: string }) {
    return apiPost<{ message: string; userId: string }>(`organizations/invitations/${token}/accept`, data);
  },
};
