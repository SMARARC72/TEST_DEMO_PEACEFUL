import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '@/pages/auth/LoginPage';
import Auth0CallbackPage from '@/pages/auth/Auth0CallbackPage';
import { PublicRoute } from '@/components/layout/PublicRoute';
import { useAuthStore } from '@/stores/auth';
import { authApi } from '@/api/auth';

const auth0State = vi.hoisted(() => ({
  isAuthenticated: false,
  isLoading: false,
  user: null,
  error: null,
  loginWithRedirect: vi.fn(),
  getAccessTokenSilently: vi.fn(),
}));

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => auth0State,
}));

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

vi.mock('@/api/client', () => ({
  apiPost: vi.fn(),
  bindTokenAccessors: vi.fn(),
}));

const defaultState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isAuth0Session: false,
};

describe('Auth pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    sessionStorage.clear();
    localStorage.clear();
    useAuthStore.setState(defaultState);
    auth0State.isAuthenticated = false;
    auth0State.isLoading = false;
    auth0State.user = null;
    auth0State.error = null;
    auth0State.getAccessTokenSilently.mockReset();
    auth0State.loginWithRedirect.mockReset();
  });

  it('shows mapped login error copy, preserves email, and clears on input', async () => {
    (authApi.login as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      null,
      { status: 401, code: 'UNAUTHORIZED', message: 'Invalid credentials' },
    ]);

    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>,
    );

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');

    fireEvent.change(emailInput, { target: { value: 'test.patient.1@peacefull.cloud' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in with email/i }));

    expect(await screen.findByText('Invalid email or password. Please try again.')).toBeInTheDocument();
    expect(emailInput).toHaveValue('test.patient.1@peacefull.cloud');

    fireEvent.change(passwordInput, { target: { value: 'new-password' } });

    await waitFor(() => {
      expect(screen.queryByText('Invalid email or password. Please try again.')).not.toBeInTheDocument();
    });
  });

  it('allows unauthenticated users through PublicRoute', () => {
    render(
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/register" element={<div>Register Screen</div>} />
          </Route>
          <Route path="/clinician" element={<div>Clinician Home</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Register Screen')).toBeInTheDocument();
  });

  it('redirects authenticated users away from PublicRoute pages', async () => {
    useAuthStore.setState({
      ...defaultState,
      isAuthenticated: true,
      user: { id: 'clinician-1', role: 'CLINICIAN' } as never,
    });

    render(
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/register" element={<div>Register Screen</div>} />
          </Route>
          <Route path="/clinician" element={<div>Clinician Home</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Clinician Home')).toBeInTheDocument();
  });

  it('shows Auth0 query errors in a user-friendly state', async () => {
    render(
      <MemoryRouter initialEntries={['/callback?error=access_denied&error_description=Session+expired']}>
        <Routes>
          <Route path="/callback" element={<Auth0CallbackPage />} />
          <Route path="/login" element={<div>Login Screen</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Authentication could not be completed')).toBeInTheDocument();
    expect(screen.getByText('Session expired')).toBeInTheDocument();
  });

  it('shows the timeout state when callback completion stalls', async () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter initialEntries={['/callback']}>
        <Routes>
          <Route path="/callback" element={<Auth0CallbackPage />} />
          <Route path="/login" element={<div>Login Screen</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });

    expect(screen.getByText('Authentication could not be completed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /return to login/i })).toBeInTheDocument();
  });
});