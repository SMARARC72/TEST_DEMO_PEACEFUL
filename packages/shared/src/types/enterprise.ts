// ─── Enterprise / Multi-Tenant Types ─────────────────────────────────
// Types for tenant management, RBAC, compliance posture, and audit logging.

/** Tenant subscription plan tier. */
export enum TenantPlan {
  PILOT = 'PILOT',
  GROWTH = 'GROWTH',
  ENTERPRISE = 'ENTERPRISE',
}

/** Enterprise configuration review status. */
export enum ConfigStatus {
  APPROVED = 'APPROVED',
  CONDITIONAL = 'CONDITIONAL',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
}

// ─── Core Interfaces ─────────────────────────────────────────────────

/** A single organizational tenant on the platform. */
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string;
  ssoEnabled: boolean;
  scimEnabled: boolean;
  plan: TenantPlan;
  settings: {
    features: Record<string, boolean>;
    branding: Record<string, string>;
  };
  createdAt: string;
}

/** Enterprise-grade configuration for a tenant (SSO, RBAC, audit). */
export interface EnterpriseConfig {
  id: string;
  tenantId: string;
  sso: {
    provider: string;
    entityId: string;
    status: string;
  };
  rbac: {
    roles: RBACRole[];
  };
  audit: {
    retentionDays: number;
    exportFormat: string;
  };
  status: ConfigStatus;
  evidence: string[];
}

export interface RBACRole {
  id: string;
  name: string;
  permissions: string[];
  tenantId: string;
}

/**
 * Snapshot of a tenant's compliance posture across multiple
 * regulatory frameworks (HIPAA, SOC 2, FDA, accessibility).
 */
export interface CompliancePosture {
  tenantId: string;
  hipaa: {
    status: string;
    controls: number;
    implemented: number;
  };
  soc2: {
    status: string;
    targetDate: string;
  };
  fda: {
    pathway: string;
    status: string;
  };
  accessibility: {
    wcag: string;
    score: number;
  };
  lastAssessed: string;
}

/**
 * Immutable, hash-chained audit log entry.
 * Each entry references the hash of the previous entry for tamper evidence.
 */
export interface AuditLogEntry {
  id: string;
  tenantId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  /** Hash of the preceding audit log entry (tamper-evidence chain). */
  previousHash: string;
  /** SHA-256 hash of this entry's content. */
  hash: string;
}

/**
 * Comprehensive regulatory status dashboard covering
 * FDA SaMD, HIPAA, 42 CFR Part 2, SOC 2, and WCAG accessibility.
 */
export interface RegulatoryStatus {
  fdaSamd: {
    pathway: string;
    status: string;
    preSubDate: string;
  };
  hipaa: {
    status: string;
    baaCount: number;
    controls: number;
  };
  cfr42: {
    status: string;
    consentTracking: boolean;
  };
  soc2: {
    status: string;
    auditor: string;
    targetDate: string;
  };
  accessibility: {
    wcagLevel: string;
    automatedScore: number;
    manualScore: number;
  };
}
