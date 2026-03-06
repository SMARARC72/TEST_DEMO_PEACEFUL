import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth';
import { useWsStore } from '@/stores/ws';

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
  bindTokenAccessors: vi.fn(),
}));

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send() {}
  close() {
    this.onclose?.();
  }
}

const defaultAuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isAuth0Session: false,
};

function makeToken(expiryMsFromNow: number) {
  const payload = {
    exp: Math.floor((Date.now() + expiryMsFromNow) / 1000),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `header.${encoded}.signature`;
}

describe('WS Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket as unknown as typeof WebSocket);
    useAuthStore.setState({
      ...defaultAuthState,
      refreshSession: vi.fn().mockResolvedValue(false),
      login: vi.fn(),
      register: vi.fn(),
      mfaVerify: vi.fn(),
      logout: vi.fn(),
      fetchMe: vi.fn(),
      setTokens: vi.fn(),
      clearAuth: vi.fn(),
      setAuth0Session: vi.fn(),
    } as any);
    useWsStore.setState({
      status: 'disconnected',
      notifications: [],
      unreadCount: 0,
    });
  });

  it('connects immediately with a fresh token', async () => {
    const token = makeToken(10 * 60 * 1000);

    useWsStore.getState().connect(token);
    await Promise.resolve();

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0]?.url).toContain(encodeURIComponent(token));
  });

  it('refreshes an expiring token before opening the socket', async () => {
    const staleToken = makeToken(30 * 1000);
    const freshToken = makeToken(10 * 60 * 1000);
    const refreshSession = vi.fn().mockImplementation(async () => {
      useAuthStore.setState({ accessToken: freshToken, refreshToken: 'refresh-next' });
      return true;
    });

    useAuthStore.setState({
      ...defaultAuthState,
      accessToken: staleToken,
      refreshToken: 'refresh-now',
      isAuthenticated: true,
      refreshSession,
      login: vi.fn(),
      register: vi.fn(),
      mfaVerify: vi.fn(),
      logout: vi.fn(),
      fetchMe: vi.fn(),
      setTokens: vi.fn(),
      clearAuth: vi.fn(),
      setAuth0Session: vi.fn(),
    } as any);

    useWsStore.getState().connect(staleToken);
    await Promise.resolve();
    await Promise.resolve();

    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0]?.url).toContain(encodeURIComponent(freshToken));
  });
});