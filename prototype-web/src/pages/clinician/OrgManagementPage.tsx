// ─── Organization Management Page ────────────────────────────────────
// Clinicians can create / view their practice, manage members, and send invites.
import { useEffect, useState, useCallback } from 'react';
import { organizationApi, type Organization, type OrgMember, type OrgInvitation } from '@/api/organizations';
import { canModerateOrganizationMembers, canReviewPendingClinician } from '@/lib/organization-access';
import { useUIStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

// ─── Create Organization Form ────────────────────────────────────────

function CreateOrgForm({ onCreated }: { onCreated: () => void }) {
  const addToast = useUIStore((s) => s.addToast);
  const [name, setName] = useState('');
  const [npi, setNpi] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    const [, err] = await organizationApi.createOrganization({
      name: name.trim(),
      npi: npi.trim() || undefined,
      phone: phone.trim() || undefined,
    });
    setLoading(false);
    if (err) {
      addToast({ variant: 'error', title: err.message ?? 'Failed to create organization' });
      return;
    }
    addToast({ variant: 'success', title: 'Organization created!' });
    setName('');
    setNpi('');
    setPhone('');
    onCreated();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Practice / Organization</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Practice Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sunrise Counseling Center"
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                NPI (optional)
              </label>
              <input
                type="text"
                value={npi}
                onChange={(e) => setNpi(e.target.value)}
                placeholder="1234567890"
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Phone (optional)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>
          <Button type="submit" disabled={loading || !name.trim()}>
            {loading ? <Spinner size="sm" /> : 'Create Organization'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Invite Member Form ──────────────────────────────────────────────

function InviteMemberForm({ orgId, onSent }: { orgId: string; onSent: () => void }) {
  const addToast = useUIStore((s) => s.addToast);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('MEMBER');
  const [loading, setLoading] = useState(false);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    const [, err] = await organizationApi.sendInvitation(orgId, {
      email: email.trim(),
      role,
    });
    setLoading(false);
    if (err) {
      addToast({ variant: 'error', title: err.message ?? 'Failed to send invitation' });
      return;
    }
    addToast({ variant: 'success', title: `Invitation sent to ${email}` });
    setEmail('');
    onSent();
  }

  return (
    <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3 py-3">
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="patient@example.com"
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
          required
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
          Role
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
        >
          <option value="MEMBER">Member</option>
          <option value="ADMIN">Admin</option>
          <option value="BILLING">Billing</option>
        </select>
      </div>
      <Button type="submit" size="sm" disabled={loading || !email.trim()}>
        {loading ? <Spinner size="sm" /> : 'Send Invite'}
      </Button>
    </form>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────

export default function OrgManagementPage() {
  const addToast = useUIStore((s) => s.addToast);
  const user = useAuthStore((s) => s.user);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invitations, setInvitations] = useState<OrgInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadOrgs = useCallback(async () => {
    setLoading(true);
    const [data, err] = await organizationApi.listOrganizations();
    setLoading(false);
    if (err) {
      addToast({ variant: 'error', title: 'Failed to load organizations' });
      return;
    }
    setOrganizations(data?.organizations ?? []);
    // Auto-select first org if none selected
    if (!selectedOrg && data?.organizations?.length) {
      setSelectedOrg(data.organizations[0]?.id ?? null);
    }
  }, [addToast, selectedOrg]);

  const loadOrgDetail = useCallback(async (orgId: string) => {
    setDetailLoading(true);
    const [memberData] = await organizationApi.listMembers(orgId);
    const [inviteData] = await organizationApi.listInvitations(orgId);
    setMembers(memberData?.members ?? []);
    setInvitations(inviteData?.invitations ?? []);
    setDetailLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard data-fetching pattern
    void loadOrgs();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard data-fetching pattern
    if (selectedOrg) void loadOrgDetail(selectedOrg);
  }, [selectedOrg, loadOrgDetail]);

  async function handleRemoveMember(userId: string) {
    if (!selectedOrg) return;
    const [, err] = await organizationApi.removeMember(selectedOrg, userId);
    if (err) {
      addToast({ variant: 'error', title: err.message ?? 'Failed to remove member' });
      return;
    }
    addToast({ variant: 'success', title: 'Member removed' });
    loadOrgDetail(selectedOrg);
  }

  async function handleRevokeInvite(inviteId: string) {
    if (!selectedOrg) return;
    const [, err] = await organizationApi.revokeInvitation(selectedOrg, inviteId);
    if (err) {
      addToast({ variant: 'error', title: err.message ?? 'Failed to revoke invitation' });
      return;
    }
    addToast({ variant: 'success', title: 'Invitation revoked' });
    loadOrgDetail(selectedOrg);
  }

  async function handleApproveMember(userId: string) {
    if (!selectedOrg) return;
    const [, err] = await organizationApi.approveMember(selectedOrg, userId);
    if (err) {
      addToast({ variant: 'error', title: err.message ?? 'Failed to approve member' });
      return;
    }
    addToast({ variant: 'success', title: 'Clinician approved' });
    loadOrgDetail(selectedOrg);
  }

  async function handleRejectMember(userId: string) {
    if (!selectedOrg) return;
    const [, err] = await organizationApi.rejectMember(selectedOrg, userId);
    if (err) {
      addToast({ variant: 'error', title: err.message ?? 'Failed to reject member' });
      return;
    }
    addToast({ variant: 'success', title: 'Clinician registration rejected' });
    loadOrgDetail(selectedOrg);
  }

  const selectedOrgData = organizations.find((o) => o.id === selectedOrg);
  const canModerateMembers = canModerateOrganizationMembers(user, selectedOrgData);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Organization Management
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-1">
          Manage your practice, team members, and patient invitations.
        </p>
      </div>

      {/* Organization selector or create form */}
      {organizations.length === 0 ? (
        <CreateOrgForm onCreated={loadOrgs} />
      ) : (
        <>
          {/* Org selector tabs */}
          <div className="flex gap-2 flex-wrap">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => setSelectedOrg(org.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedOrg === org.id
                    ? 'bg-brand-500 text-white'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                {org.name}
                {org._count?.memberships != null && (
                  <span className="ml-2 text-xs opacity-70">({org._count.memberships})</span>
                )}
              </button>
            ))}
            <button
              onClick={() => setSelectedOrg(null)}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
            >
              + New Organization
            </button>
          </div>

          {!selectedOrg ? (
            <CreateOrgForm onCreated={loadOrgs} />
          ) : (
            <>
              {/* Organization Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">🏥</span>
                    {selectedOrgData?.name ?? 'Organization'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    {selectedOrgData?.npi && (
                      <div>
                        <dt className="text-neutral-500 dark:text-neutral-400">NPI</dt>
                        <dd className="font-medium text-neutral-900 dark:text-white">{selectedOrgData.npi}</dd>
                      </div>
                    )}
                    {selectedOrgData?.phone && (
                      <div>
                        <dt className="text-neutral-500 dark:text-neutral-400">Phone</dt>
                        <dd className="font-medium text-neutral-900 dark:text-white">{selectedOrgData.phone}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-neutral-500 dark:text-neutral-400">Your Role</dt>
                      <dd className="font-medium text-neutral-900 dark:text-white">
                        {selectedOrgData?.role ?? 'Member'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-neutral-500 dark:text-neutral-400">Members</dt>
                      <dd className="font-medium text-neutral-900 dark:text-white">
                        {selectedOrgData?._count?.memberships ?? members.length}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              {/* Members */}
              <Card>
                <CardHeader>
                  <CardTitle>Team Members</CardTitle>
                </CardHeader>
                <CardContent>
                  {detailLoading ? (
                    <div className="flex justify-center py-6">
                      <Spinner />
                    </div>
                  ) : (
                    <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                      {members.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-sm">
                              {m.user.firstName?.[0]}{m.user.lastName?.[0]}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-neutral-900 dark:text-white">
                                {m.user.firstName} {m.user.lastName}
                              </p>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                {m.user.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                m.user.status === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                  : m.user.status === 'SUSPENDED'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                    : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                              }`}
                            >
                              {m.user.status}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                m.role === 'OWNER'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                  : m.role === 'ADMIN'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                    : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                              }`}
                            >
                              {m.role}
                            </span>
                            {canReviewPendingClinician(user, selectedOrgData, m) && (
                              <>
                                <button
                                  onClick={() => handleApproveMember(m.userId)}
                                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                                  title="Approve clinician"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRejectMember(m.userId)}
                                  className="text-xs font-medium text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                  title="Reject clinician"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {m.userId !== user?.id && m.role !== 'OWNER' && canModerateMembers && (
                              <button
                                onClick={() => handleRemoveMember(m.userId)}
                                className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                title="Remove member"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {members.length === 0 && (
                        <p className="text-sm text-neutral-500 py-4 text-center">
                          No members yet.
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Invite */}
              <Card>
                <CardHeader>
                  <CardTitle>Invite Members</CardTitle>
                </CardHeader>
                <CardContent>
                  <InviteMemberForm
                    orgId={selectedOrg}
                    onSent={() => loadOrgDetail(selectedOrg)}
                  />

                  {/* Pending invitations */}
                  {invitations.filter((i) => i.status === 'PENDING').length > 0 && (
                    <div className="mt-4 border-t border-neutral-200 dark:border-neutral-700 pt-4">
                      <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Pending Invitations
                      </h4>
                      <div className="space-y-2">
                        {invitations
                          .filter((i) => i.status === 'PENDING')
                          .map((inv) => (
                            <div
                              key={inv.id}
                              className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/50 rounded-lg px-3 py-2"
                            >
                              <div>
                                <p className="text-sm text-neutral-900 dark:text-white">
                                  {inv.email}
                                </p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                  Invited as {inv.role} &middot; Expires{' '}
                                  {new Date(inv.expiresAt).toLocaleDateString()}
                                </p>
                              </div>
                              <button
                                onClick={() => handleRevokeInvite(inv.id)}
                                className="text-xs text-red-500 hover:text-red-700 dark:text-red-400"
                              >
                                Revoke
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
