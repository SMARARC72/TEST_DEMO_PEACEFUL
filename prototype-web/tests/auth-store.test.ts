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

const defaultState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isAuth0Session: false,
};

describe('Auth Store — Registration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState(defaultState);
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
    useAuthStore.setState(defaultState);
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
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState(defaultState);
  });

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

  it('logs out cleanly without a refresh token', async () => {
    (authApi.logout as ReturnType<typeof vi.fn>).mockResolvedValueOnce([{ success: true }, null]);

    await useAuthStore.getState().logout();

    expect(authApi.logout).toHaveBeenCalledWith(undefined);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

describe('Auth Store — Session helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState(defaultState);
  });

  it('sets tokens directly', () => {
    useAuthStore.getState().setTokens('access-direct', 'refresh-direct');

    expect(useAuthStore.getState()).toMatchObject({
      accessToken: 'access-direct',
      refreshToken: 'refresh-direct',
      isAuthenticated: true,
    });
  });

  it('clears auth state directly', () => {
    useAuthStore.setState({
      ...defaultState,
      user: { id: 'u1' } as any,
      accessToken: 'access',
      refreshToken: 'refresh',
      isAuthenticated: true,
      error: 'bad-state',
      isAuth0Session: true,
    });

    useAuthStore.getState().clearAuth();

    expect(useAuthStore.getState()).toMatchObject(defaultState);
  });

  it('sets an Auth0 session', () => {
    const mockUser = {
      id: 'auth0-user',
      tenantId: 't1',
      email: 'auth0@test.com',
      role: 'CLINICIAN',
      profile: { firstName: 'Auth', lastName: 'Zero' },
      mfaEnabled: true,
      status: 'ACTIVE',
      createdAt: '2026-01-01',
    };

    useAuthStore.getState().setAuth0Session('auth0-access', mockUser as any);

    expect(useAuthStore.getState()).toMatchObject({
      user: mockUser,
      accessToken: 'auth0-access',
      refreshToken: null,
      isAuthenticated: true,
      isLoading: false,
      isAuth0Session: true,
    });
  });
});

describe('Auth Store — MFA and profile refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState(defaultState);
  });

  it('refreshes the session and rotates tokens', async () => {
    useAuthStore.setState({
      ...defaultState,
      accessToken: 'stale-access',
      refreshToken: 'refresh-123',
      isAuthenticated: true,
    });

    (authApi.refresh as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { accessToken: 'fresh-access', refreshToken: 'fresh-refresh' },
      null,
    ]);

    await expect(useAuthStore.getState().refreshSession()).resolves.toBe(true);
    expect(authApi.refresh).toHaveBeenCalledWith('refresh-123');
    expect(useAuthStore.getState()).toMatchObject({
      accessToken: 'fresh-access',
      refreshToken: 'fresh-refresh',
      isAuthenticated: true,
    });
  });

  it('clears auth when session refresh fails', async () => {
    useAuthStore.setState({
      ...defaultState,
      user: { id: 'u1' } as any,
      accessToken: 'stale-access',
      refreshToken: 'refresh-123',
      isAuthenticated: true,
    });

    (authApi.refresh as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      null,
      { status: 401, code: 'UNAUTHORIZED', message: 'Expired refresh token' },
    ]);

    await expect(useAuthStore.getState().refreshSession()).resolves.toBe(false);
    expect(useAuthStore.getState()).toMatchObject(defaultState);
  });

  it('stores session data after MFA verification', async () => {
    const mockUser = {
      id: 'u-mfa',
      tenantId: 't1',
      email: 'mfa@test.com',
      role: 'CLINICIAN',
      profile: { firstName: 'Mfa', lastName: 'User' },
      mfaEnabled: true,
      status: 'ACTIVE',
      createdAt: '2026-01-01',
    };

    (authApi.mfaVerify as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { accessToken: 'mfa-access', refreshToken: 'mfa-refresh', user: mockUser },
      null,
    ]);

    await useAuthStore.getState().mfaVerify('u-mfa', '123456');

    expect(useAuthStore.getState()).toMatchObject({
      user: mockUser,
      accessToken: 'mfa-access',
      refreshToken: 'mfa-refresh',
      isAuthenticated: true,
      isLoading: false,
    });
  });

  it('surfaces MFA verification errors', async () => {
    (authApi.mfaVerify as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      null,
      { status: 401, code: 'UNAUTHORIZED', message: 'Invalid MFA code' },
    ]);

    await expect(useAuthStore.getState().mfaVerify('u-mfa', '000000')).rejects.toThrow('Invalid MFA code');
    expect(useAuthStore.getState()).toMatchObject({
      error: 'Invalid MFA code',
      isLoading: false,
    });
  });

  it('hydrates the current user from fetchMe', async () => {
    const mockUser = {
      id: 'u-fetch',
      tenantId: 't1',
      email: 'fetch@test.com',
      role: 'PATIENT',
      profile: { firstName: 'Fetch', lastName: 'User' },
      mfaEnabled: false,
      status: 'ACTIVE',
      createdAt: '2026-01-01',
    };

    (authApi.getMe as ReturnType<typeof vi.fn>).mockResolvedValueOnce([mockUser, null]);

    await useAuthStore.getState().fetchMe();

    expect(useAuthStore.getState().user).toEqual(mockUser);
  });

  it('clears auth on fetchMe 401', async () => {
    useAuthStore.setState({
      ...defaultState,
      user: { id: 'u1' } as any,
      accessToken: 'access',
      refreshToken: 'refresh',
      isAuthenticated: true,
    });
    (authApi.getMe as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      null,
      { status: 401, code: 'UNAUTHORIZED', message: 'Expired' },
    ]);

    await useAuthStore.getState().fetchMe();

    expect(useAuthStore.getState()).toMatchObject(defaultState);
  });

  it('does not clear auth on non-401 fetchMe errors', async () => {
    useAuthStore.setState({
      ...defaultState,
      user: { id: 'u1' } as any,
      accessToken: 'access',
      refreshToken: 'refresh',
      isAuthenticated: true,
    });
    (authApi.getMe as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      null,
      { status: 500, code: 'SERVER_ERROR', message: 'Retry later' },
    ]);

    await useAuthStore.getState().fetchMe();

    expect(useAuthStore.getState()).toMatchObject({
      user: { id: 'u1' },
      accessToken: 'access',
      refreshToken: 'refresh',
      isAuthenticated: true,
    });
  });

  it('handles registration responses without tokens', async () => {
    (authApi.register as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { message: 'Registration accepted' },
      null,
    ]);

    await useAuthStore.getState().register({
      email: 'pending@test.com',
      password: 'StrongP@ss2026!',
      firstName: 'Pending',
      lastName: 'User',
      role: 'PATIENT',
    });

    expect(useAuthStore.getState()).toMatchObject(defaultState);
  });
});
