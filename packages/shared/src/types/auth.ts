// ─── Authentication & Authorization Types ────────────────────────────
// Types for user identity, sessions, RBAC permissions, and JWT payloads.

/** Platform-wide user role. */
export enum UserRole {
  PATIENT = 'PATIENT',
  CLINICIAN = 'CLINICIAN',
  SUPERVISOR = 'SUPERVISOR',
  ADMIN = 'ADMIN',
  COMPLIANCE_OFFICER = 'COMPLIANCE_OFFICER',
}

/** Account lifecycle status. */
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DEACTIVATED = 'DEACTIVATED',
}

/** Supported MFA methods. */
export enum MFAMethod {
  TOTP = 'TOTP',
  SMS = 'SMS',
  FIDO2 = 'FIDO2',
}

/** Permission action verbs. */
export enum PermissionAction {
  READ = 'READ',
  WRITE = 'WRITE',
  DELETE = 'DELETE',
  EXPORT = 'EXPORT',
  ADMIN = 'ADMIN',
}

// ─── Core Interfaces ─────────────────────────────────────────────────

/** Platform user account (patients, clinicians, admins). */
export interface User {
  id: string;
  tenantId: string;
  email: string;
  role: UserRole;
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
  };
  mfaEnabled: boolean;
  mfaMethod?: MFAMethod;
  lastLogin?: string;
  status: UserStatus;
  createdAt: string;
}

/** Authenticated session bound to a user and tenant. */
export interface Session {
  id: string;
  userId: string;
  tenantId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  createdAt: string;
  ipAddress: string;
  userAgent: string;
}

/** A resource-level permission grant. */
export interface Permission {
  resource: string;
  actions: PermissionAction[];
}

/**
 * JWT access-token payload.
 * - `sub` = userId
 * - `tid` = tenantId
 */
export interface AuthTokenPayload {
  /** User ID (subject). */
  sub: string;
  /** Tenant ID. */
  tid: string;
  role: UserRole;
  permissions: string[];
  /** Issued-at (epoch seconds). */
  iat: number;
  /** Expiration (epoch seconds). */
  exp: number;
}
