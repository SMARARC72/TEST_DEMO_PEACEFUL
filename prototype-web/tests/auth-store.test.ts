// ─── Auth Store Extended Tests ────────────────────────────────────────
// Tests for registration, login, MFA, and logout flows in the auth store.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth';

// Mock the auth API
vi.mock('@/api/auth', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    mfaVerify: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn(),
    refresh: vi.fn(),
  },
}));

// Mock the client bindings
vi.mock('@/api/client', () => ({
  bindTokenAccessors: vi.fn(),
}));

import { authApi } from '@/api/auth';

describe('Auth Store — Registration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isAuth0Session: false,
    });
  });

  it('sets user and tokens for patient registration', async () => {
    const mockUser = {
      id: 'u1',
      tenantId: 't1',
      email: 'patient@test.com',
      role: 'PATIENT',
      profile: { firstName: 'Jane', lastName: 'Doe' },
      mfaEnabled: false,
      status: 'ACTIVE',
      createdAt: '2026-01-01',
    };

    (authApi.register as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { accessToken: 'at-123', refreshToken: 'rt-456', user: mockUser },
      null,
    ]);

    await useAuthStore.getState().register({
      email: 'patient@test.com',
      password: 'StrongP@ss2026!',
      firstName: 'Jane',
      lastName: 'Doe',
      role: 'PATIENT',
    });

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.accessToken).toBe('at-123');
    expect(state.refreshToken).toBe('rt-456');
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it('leaves user null for clinician pending approval', async () => {
    (authApi.register as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { message: 'Pending admin approval', userId: 'u2', status: 'PENDING_APPROVAL' },
      null,
    ]);

    await useAuthStore.getState().register({
      email: 'dr@test.com',
      password: 'StrongP@ss2026!',
      firstName: 'Dr',
      lastName: 'Smith',
      role: 'CLINICIAN',
    });

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
  });

  it('throws on registration error', async () => {
    (authApi.register as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      null,
      { status: 409, code: 'CONFLICT', message: 'An account with this email already exists' },
    ]);

    await expect(
      useAuthStore.getState().register({
        email: 'existing@test.com',
        password: 'StrongP@ss2026!',
        firstName: 'Dupe',
        lastName: 'User',
        role: 'PATIENT',
      }),
    ).rejects.toThrow('An account with this email already exists');

    expect(useAuthStore.getState().error).toBe('An account with this email already exists');
  });
});

describe('Auth Store — Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  it('sets user and tokens on successful login', async () => {
    const mockUser = {
      id: 'u1',
      tenantId: 't1',
      email: 'test@test.com',
      role: 'PATIENT',
      profile: { firstName: 'Test', lastName: 'User' },
      mfaEnabled: false,
    };

    (authApi.login as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { accessToken: 'at-abc', refreshToken: 'rt-xyz', user: mockUser },
      null,
    ]);

    const result = await useAuthStore.getState().login('test@test.com', 'password');
    expect(result).toEqual({});
    expect(useAuthStore.getState().user).toEqual(mockUser);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('returns mfaRequired when MFA is needed', async () => {
    (authApi.login as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { mfaRequired: true, userId: 'u2' },
      null,
    ]);

    const result = await useAuthStore.getState().login('clinician@test.com', 'password');
    expect(result).toEqual({ mfaRequired: true, userId: 'u2' });
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('throws on invalid credentials', async () => {
    (authApi.login as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      null,
      { status: 401, code: 'UNAUTHORIZED', message: 'Invalid credentials' },
    ]);

    await expect(
      useAuthStore.getState().login('wrong@test.com', 'badpassword'),
    ).rejects.toThrow('Invalid credentials');
  });
});

describe('Auth Store — Logout', () => {
  it('clears all auth state on logout', async () => {
    useAuthStore.setState({
      user: { id: 'u1' } as any,
      accessToken: 'at-123',
      refreshToken: 'rt-456',
      isAuthenticated: true,
    });

    (authApi.logout as ReturnType<typeof vi.fn>).mockResolvedValueOnce([{ success: true }, null]);

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});
