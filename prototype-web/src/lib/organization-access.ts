import type { OrgMember, Organization } from '@/api/organizations';
import type { User } from '@/api/types';

export function canModerateOrganizationMembers(
  currentUser: User | null,
  organization: Organization | undefined,
): boolean {
  if (!currentUser || !organization) {
    return false;
  }

  const hasOrgRole = organization.role === 'OWNER' || organization.role === 'ADMIN';
  const hasPlatformRole = currentUser.role === 'SUPERVISOR' || currentUser.role === 'ADMIN';

  return hasOrgRole && hasPlatformRole;
}

export function canReviewPendingClinician(
  currentUser: User | null,
  organization: Organization | undefined,
  member: OrgMember,
): boolean {
  return (
    canModerateOrganizationMembers(currentUser, organization)
    && member.userId !== currentUser?.id
    && member.user.role === 'CLINICIAN'
    && member.user.status === 'SUSPENDED'
  );
}