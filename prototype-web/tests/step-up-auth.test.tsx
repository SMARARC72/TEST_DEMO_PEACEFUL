import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StepUpAuth } from '@/components/domain/StepUpAuth';
import { useAuthStore } from '@/stores/auth';

vi.mock('@/api/auth', () => ({
  authApi: {
    stepUpVerify: vi.fn(),
    stepUpMfa: vi.fn(),
  },
}));

import { authApi } from '@/api/auth';

describe('StepUpAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLDialogElement.prototype.showModal = vi.fn(function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    });
    HTMLDialogElement.prototype.close = vi.fn(function close(this: HTMLDialogElement) {
      this.removeAttribute('open');
    });
    useAuthStore.setState({
      user: {
        id: 'clinician-1',
        tenantId: 'tenant-1',
        email: 'clinician@example.com',
        role: 'CLINICIAN',
        status: 'ACTIVE',
        profile: { firstName: 'Alex', lastName: 'Provider' },
        mfaEnabled: true,
        mfaMethod: 'TOTP',
        createdAt: '2026-03-06T00:00:00.000Z',
      },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
      isAuth0Session: false,
    });
  });

  it('shows authenticator copy for TOTP step-up challenges', async () => {
    (authApi.stepUpVerify as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      {
        mfaRequired: true,
        method: 'TOTP',
        message: 'Enter the 6-digit code from your authenticator app.',
      },
      null,
    ]);

    render(<StepUpAuth open onSuccess={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'DemoPassword2026!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

    expect(await screen.findByText('Enter the 6-digit code from your authenticator app.')).toBeInTheDocument();
    expect(screen.getByLabelText('Authenticator Code')).toBeInTheDocument();
  });

  it('shows email copy for legacy email step-up challenges', async () => {
    (authApi.stepUpVerify as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      {
        mfaRequired: true,
        method: 'EMAIL',
        message: 'MFA code sent to your email address',
      },
      null,
    ]);

    render(<StepUpAuth open onSuccess={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'DemoPassword2026!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

    expect(await screen.findByText('MFA code sent to your email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Verification Code')).toBeInTheDocument();
  });
});