import { beforeEach, describe, expect, it, vi } from 'vitest';

let capturedHooks:
  | {
      beforeRequest: Array<(request: Request) => void>;
      afterResponse: Array<
        (
          request: Request,
          options: unknown,
          response: Response,
        ) => Promise<unknown> | unknown
      >;
    }
  | null = null;

const kyRequestMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
const kyPostMock = vi.fn();

vi.mock('ky', () => {
  const create = vi.fn((config: { hooks: typeof capturedHooks }) => {
    capturedHooks = config.hooks;
    return {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };
  });

  const kyDefault = Object.assign(kyRequestMock, {
    create,
    post: kyPostMock,
  });

  return {
    default: kyDefault,
  };
});

vi.mock('@/stores/tenant', () => ({
  getCurrentTenantId: vi.fn(() => null),
}));

describe('api client auth mode resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    capturedHooks = null;
  });

  it('still attaches Authorization headers when cookie mode is configured but bearer tokens exist', async () => {
    vi.stubEnv('VITE_AUTH_MODE', 'cookie');

    const { bindTokenAccessors } = await import('@/api/client');
    bindTokenAccessors({
      getAccessToken: () => 'access-token-123',
      getRefreshToken: () => 'refresh-token-123',
      setTokens: vi.fn(),
      clearAuth: vi.fn(),
    });

    const request = new Request('https://example.com/patients');
    capturedHooks?.beforeRequest[0]?.(request);

    expect(request.headers.get('Authorization')).toBe('Bearer access-token-123');
  });

  it('prefers bearer refresh payloads before cookie fallback when refresh tokens exist', async () => {
    vi.stubEnv('VITE_AUTH_MODE', 'cookie');
    let accessToken = 'stale-access';
    const setTokens = vi.fn((nextAccess: string) => {
      accessToken = nextAccess;
    });
    const clearAuth = vi.fn();

    kyPostMock.mockReturnValueOnce({
      json: async () => ({
        data: {
          accessToken: 'fresh-access',
          refreshToken: 'fresh-refresh',
        },
        requestId: 'req-1',
      }),
    });

    const { bindTokenAccessors } = await import('@/api/client');
    bindTokenAccessors({
      getAccessToken: () => accessToken,
      getRefreshToken: () => 'refresh-token-123',
      setTokens,
      clearAuth,
    });

    const request = new Request('https://example.com/patients');
    const response = new Response('', { status: 401 });

    await capturedHooks?.afterResponse[0]?.(request, {}, response);

    expect(kyPostMock).toHaveBeenCalledWith('/api/v1/auth/refresh', {
      json: { refreshToken: 'refresh-token-123' },
    });
    expect(setTokens).toHaveBeenCalledWith('fresh-access', 'fresh-refresh');
    expect(clearAuth).not.toHaveBeenCalled();
    expect(kyRequestMock).toHaveBeenCalledOnce();
    expect(request.headers.get('Authorization')).toBe('Bearer fresh-access');
  });
});
