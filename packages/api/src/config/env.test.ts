import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

function baseEnv() {
  return {
    ...ORIGINAL_ENV,
    DATABASE_URL: "postgresql://localhost:5432/peacefull?schema=public",
    ANTHROPIC_API_KEY: "test-key",
    JWT_SECRET: "a".repeat(32),
    JWT_REFRESH_SECRET: "b".repeat(32),
    CORS_ORIGIN: "http://localhost:5173,http://localhost:4173",
    NODE_ENV: "development",
  };
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("environment validation", () => {
  it("fails fast when wildcard CORS origin is set in staging", async () => {
    process.env = {
      ...baseEnv(),
      NODE_ENV: "staging",
      CORS_ORIGIN: "https://staging.peacefull.cloud,*",
    };

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      code?: number,
    ) => {
      throw new Error(`process.exit:${code}`);
    }) as never);

    await expect(import("./env.js")).rejects.toThrow("process.exit:1");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
