// ─── Auth API ────────────────────────────────────────────────────────
import { apiPost, apiGet } from './client';
import type {
  LoginResponse,
  MfaRequiredResponse,
  RegisterResponse,
  TokenPair,
  User,
} from './types';

export const authApi = {
  login(email: string, password: string) {
    return apiPost<LoginResponse | MfaRequiredResponse>('auth/login', {
      email,
      password,
    });
  },

  register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'PATIENT' | 'CLINICIAN';
    tenantId?: string;
  }) {
    return apiPost<RegisterResponse>('auth/register', data);
  },

  mfaVerify(userId: string, code: string) {
    return apiPost<LoginResponse>('auth/mfa-verify', { userId, code });
  },

  refresh(refreshToken: string) {
    return apiPost<TokenPair>('auth/refresh', { refreshToken });
  },

  logout(refreshToken?: string) {
    return apiPost<{ success: boolean }>('auth/logout', { refreshToken });
  },

  getMe() {
    return apiGet<User>('auth/me');
  },

  requestPasswordReset(email: string) {
    return apiPost<{ success: boolean }>('auth/forgot-password', { email });
  },

  /** Step-up auth: re-verify password before sensitive actions */
  stepUpVerify(password: string) {
    return apiPost<{ elevatedToken?: string; mfaRequired?: boolean }>(
      'auth/step-up/verify',
      { password },
    );
  },

  /** Step-up auth: MFA verification for elevated access */
  stepUpMfa(code: string) {
    return apiPost<{ elevatedToken: string }>('auth/step-up/mfa', { code });
  },

  /** Fetch available tenants for the tenant selector */
  getTenants() {
    return apiGet<{ tenants: Array<{ id: string; slug: string; name: string; logoUrl?: string; primaryColor?: string }> }>('auth/tenants');
  },
} as const;
