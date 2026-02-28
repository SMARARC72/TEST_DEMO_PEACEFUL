// ─── Health Endpoint & Server Smoke Tests ────────────────────────────
import { describe, it, expect } from 'vitest';

describe('API configuration', () => {
  it('has required environment variables for tests', () => {
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.JWT_SECRET!.length).toBeGreaterThanOrEqual(32);
  });

  it('NODE_ENV is set to test', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('config constants', () => {
  it('exports correct API version', async () => {
    const { API_VERSION } = await import('../config/index.js');
    expect(API_VERSION).toBe('v1');
  });

  it('exports PHI field list', async () => {
    const { PHI_FIELDS } = await import('../config/index.js');
    expect(PHI_FIELDS).toContain('name');
    expect(PHI_FIELDS).toContain('diagnosis');
    expect(PHI_FIELDS).toContain('content');
    expect(PHI_FIELDS.length).toBeGreaterThan(10);
  });

  it('defines rate limit constants', async () => {
    const { RATE_LIMIT_WINDOW, RATE_LIMIT_MAX } = await import('../config/index.js');
    expect(RATE_LIMIT_WINDOW).toBeGreaterThan(0);
    expect(RATE_LIMIT_MAX).toBeGreaterThan(0);
  });
});
