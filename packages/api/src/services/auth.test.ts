// ─── Auth Service Unit Tests ─────────────────────────────────────────
// Tests JWT generation, password hashing, and MFA utilities.

import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import {
  generateTokens,
  generateStepUpToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashPassword,
  verifyPassword,
  generateMFACode,
  verifyMFACode,
} from "../services/auth.js";
import { UserRole } from "@peacefull/shared";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

const mockUser = {
  id: "user-test-001",
  tenantId: "tenant-test-001",
  role: UserRole.CLINICIAN,
};

// ─── Token Generation ────────────────────────────────────────────────

describe("generateTokens", () => {
  it("returns accessToken, refreshToken, and expiresIn", () => {
    const result = generateTokens(mockUser);
    expect(result).toHaveProperty("accessToken");
    expect(result).toHaveProperty("refreshToken");
    expect(result).toHaveProperty("expiresIn");
    expect(typeof result.accessToken).toBe("string");
    expect(typeof result.refreshToken).toBe("string");
  });

  it("access token contains correct claims", () => {
    const { accessToken } = generateTokens(mockUser);
    const decoded = jwt.verify(accessToken, JWT_SECRET) as Record<
      string,
      unknown
    >;

    expect(decoded.sub).toBe(mockUser.id);
    expect(decoded.tid).toBe(mockUser.tenantId);
    expect(decoded.role).toBe(mockUser.role);
    expect(decoded.permissions).toBeDefined();
    expect(Array.isArray(decoded.permissions)).toBe(true);
  });

  it("refresh token contains user identity", () => {
    const { refreshToken } = generateTokens(mockUser);
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as Record<
      string,
      unknown
    >;

    expect(decoded.sub).toBe(mockUser.id);
    expect(decoded.tid).toBe(mockUser.tenantId);
    expect(decoded.type).toBe("refresh");
  });

  it("derives correct permissions for each role", () => {
    const roles = [
      UserRole.PATIENT,
      UserRole.CLINICIAN,
      UserRole.SUPERVISOR,
      UserRole.ADMIN,
      UserRole.COMPLIANCE_OFFICER,
    ];

    for (const role of roles) {
      const { accessToken } = generateTokens({ ...mockUser, role });
      const decoded = jwt.verify(accessToken, JWT_SECRET) as Record<
        string,
        unknown
      >;
      expect(Array.isArray(decoded.permissions)).toBe(true);
      expect((decoded.permissions as string[]).length).toBeGreaterThan(0);
    }
  });

  it("PATIENT gets read:own and write:own", () => {
    const { accessToken } = generateTokens({
      ...mockUser,
      role: UserRole.PATIENT,
    });
    const decoded = jwt.verify(accessToken, JWT_SECRET) as Record<
      string,
      unknown
    >;
    const perms = decoded.permissions as string[];

    expect(perms).toContain("read:own");
    expect(perms).toContain("write:own");
  });

  it("ADMIN gets admin:all", () => {
    const { accessToken } = generateTokens({
      ...mockUser,
      role: UserRole.ADMIN,
    });
    const decoded = jwt.verify(accessToken, JWT_SECRET) as Record<
      string,
      unknown
    >;
    const perms = decoded.permissions as string[];

    expect(perms).toContain("admin:all");
  });
});

// ─── Step-Up Token ───────────────────────────────────────────────────

describe("generateStepUpToken", () => {
  it("includes stepUpAt claim", () => {
    const { accessToken } = generateStepUpToken(mockUser);
    const decoded = jwt.verify(accessToken, JWT_SECRET) as Record<
      string,
      unknown
    >;

    expect(decoded.stepUpAt).toBeDefined();
    expect(typeof decoded.stepUpAt).toBe("number");
  });

  it("stepUpAt is within 5 seconds of current time", () => {
    const nowSecs = Math.floor(Date.now() / 1000);
    const { accessToken } = generateStepUpToken(mockUser);
    const decoded = jwt.verify(accessToken, JWT_SECRET) as Record<
      string,
      unknown
    >;

    const diff = Math.abs((decoded.stepUpAt as number) - nowSecs);
    expect(diff).toBeLessThan(5);
  });
});

// ─── Token Verification ─────────────────────────────────────────────

describe("verifyAccessToken", () => {
  it("decodes a valid access token", () => {
    const { accessToken } = generateTokens(mockUser);
    const decoded = verifyAccessToken(accessToken);

    expect(decoded.sub).toBe(mockUser.id);
    expect(decoded.tid).toBe(mockUser.tenantId);
  });

  it("throws on invalid token", () => {
    expect(() => verifyAccessToken("invalid.token.here")).toThrow();
  });

  it("throws on expired token", () => {
    const expired = jwt.sign(
      { sub: "u1", tid: "t1", role: "PATIENT", permissions: [] },
      JWT_SECRET,
      { expiresIn: "-1s" },
    );
    expect(() => verifyAccessToken(expired)).toThrow();
  });
});

describe("verifyRefreshToken", () => {
  it("decodes a valid refresh token", () => {
    const { refreshToken } = generateTokens(mockUser);
    const decoded = verifyRefreshToken(refreshToken);

    expect(decoded.sub).toBe(mockUser.id);
    expect(decoded.type).toBe("refresh");
  });

  it("throws on wrong secret", () => {
    const badToken = jwt.sign({ sub: "u1" }, "wrong-secret", {
      expiresIn: "1h",
    });
    expect(() => verifyRefreshToken(badToken)).toThrow();
  });
});

// ─── Password Hashing ───────────────────────────────────────────────

describe("Password hashing", () => {
  it("hashes and verifies a password", async () => {
    const plain = "SuperSecret123!";
    const hash = await hashPassword(plain);

    expect(hash).not.toBe(plain);
    expect(hash.startsWith("$2")).toBe(true); // bcrypt prefix

    const matches = await verifyPassword(plain, hash);
    expect(matches).toBe(true);
  });

  it("rejects wrong password", async () => {
    const hash = await hashPassword("correct-password");
    const matches = await verifyPassword("wrong-password", hash);
    expect(matches).toBe(false);
  });

  it("produces different hashes for the same password (random salt)", async () => {
    const hash1 = await hashPassword("same");
    const hash2 = await hashPassword("same");
    expect(hash1).not.toBe(hash2);
  }, 30_000);
});

// ─── MFA ─────────────────────────────────────────────────────────────

describe("MFA utilities", () => {
  it("generates a 6-digit code", () => {
    const code = generateMFACode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it("generates unique codes", () => {
    const codes = new Set(Array.from({ length: 10 }, generateMFACode));
    // With 900,000 possible values, 10 draws should yield all unique
    expect(codes.size).toBe(10);
  });

  it("verifyMFACode returns true on match", () => {
    const code = generateMFACode();
    expect(verifyMFACode(code, code)).toBe(true);
  });

  it("verifyMFACode returns false on mismatch", () => {
    expect(verifyMFACode("123456", "654321")).toBe(false);
  });
});
