// ─── WebSocket Notification Service ──────────────────────────────────
// Real-time event delivery for triage alerts, escalation updates,
// new submissions, and system broadcasts.

import { create } from 'zustand';
import { useAuthStore } from '@/stores/auth';

// ─── Types ──────────────────────────────────────────────────────────

export type NotificationType =
  | 'TRIAGE_ALERT'
  | 'ESCALATION'
  | 'NEW_SUBMISSION'
  | 'DRAFT_READY'
  | 'SYSTEM'
  | 'SESSION_REMINDER';

export interface WsNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  /** ISO timestamp */
  timestamp: string;
  /** Whether the user has seen/dismissed this */
  read: boolean;
  /** Optional deep-link path within the app */
  link?: string;
  /** Urgency level for visual styling */
  priority: 'low' | 'medium' | 'high' | 'critical';
  /** Arbitrary metadata */
  meta?: Record<string, unknown>;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface WsState {
  /** Live connection status */
  status: ConnectionStatus;
  /** Ordered notification list (newest first) */
  notifications: WsNotification[];
  /** Unread count for badge */
  unreadCount: number;

  // Actions
  connect: (token: string | null) => void;
  disconnect: () => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;

  // Internal
  _addNotification: (n: WsNotification) => void;
}

// ─── Reconnection config ─────────────────────

const WS_BASE = import.meta.env.VITE_WS_URL ?? (
  typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
    : 'ws://localhost:3001/ws'
);

const MAX_RECONNECT_DELAY = 30_000;
const INITIAL_RECONNECT_DELAY = 1_000;
const TOKEN_REFRESH_LEEWAY_MS = 120_000;

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = INITIAL_RECONNECT_DELAY;
let intentionalClose = false;

// ─── Store ──────────────────────────────────────────────────────────

export const useWsStore = create<WsState>()((set, get) => ({
  status: 'disconnected',
  notifications: [],
  unreadCount: 0,

  connect: (token: string | null) => {
    get().disconnect();
    intentionalClose = false;

    void openSocket(token);
  },

  disconnect: () => {
    intentionalClose = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (socket) {
      socket.close(1000, 'Client disconnect');
      socket = null;
    }
    set({ status: 'disconnected' });
  },

  markRead: (id) =>
    set((s) => {
      const notifications = s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      );
      return { notifications, unreadCount: notifications.filter((n) => !n.read).length };
    }),

  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  clearAll: () => set({ notifications: [], unreadCount: 0 }),

  _addNotification: (n) =>
    set((s) => {
      const notifications = [n, ...s.notifications].slice(0, 200); // cap at 200
      return { notifications, unreadCount: notifications.filter((x) => !x.read).length };
    }),
}));

async function openSocket(token: string | null) {
  const resolvedToken = await getValidSocketToken(token);
  if (!resolvedToken) {
    useWsStore.setState({ status: 'error' });
    return;
  }

  const url = `${WS_BASE}?token=${encodeURIComponent(resolvedToken)}`;
  useWsStore.setState({ status: 'connecting' });

  try {
    socket = new WebSocket(url);
  } catch {
    useWsStore.setState({ status: 'error' });
    scheduleReconnect();
    return;
  }

  socket.onopen = () => {
    useWsStore.setState({ status: 'connected' });
    reconnectDelay = INITIAL_RECONNECT_DELAY;
  };

  socket.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);

      if (payload.type === 'ping') {
        socket?.send(JSON.stringify({ type: 'pong' }));
        return;
      }

      const notification = mapServerEvent(payload);
      if (notification) {
        useWsStore.getState()._addNotification(notification);
      }
    } catch {
      // Ignore malformed messages
    }
  };

  socket.onerror = () => {
    useWsStore.setState({ status: 'error' });
  };

  socket.onclose = () => {
    useWsStore.setState({ status: 'disconnected' });
    socket = null;
    if (!intentionalClose) {
      scheduleReconnect();
    }
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function decodeJwtExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(normalized)) as { exp?: number };
    return typeof decoded.exp === 'number' ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

async function getValidSocketToken(token: string | null) {
  const currentToken = token ?? useAuthStore.getState().accessToken;
  if (!currentToken) {
    return null;
  }

  const expiresAt = decodeJwtExpiry(currentToken);
  if (!expiresAt || expiresAt - Date.now() > TOKEN_REFRESH_LEEWAY_MS) {
    return currentToken;
  }

  const refreshed = await useAuthStore.getState().refreshSession();
  if (!refreshed) {
    return null;
  }

  return useAuthStore.getState().accessToken;
}

function scheduleReconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    useWsStore.getState().connect(useAuthStore.getState().accessToken);
  }, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
}

let notifCounter = 0;

function mapServerEvent(payload: Record<string, unknown>): WsNotification | null {
  const type = payload.type as string;
  const id = (payload.id as string) ?? `ws-${++notifCounter}-${Date.now()}`;

  switch (type) {
    case 'triage:new':
      return {
        id,
        type: 'TRIAGE_ALERT',
        title: 'New Triage Alert',
        body: (payload.message as string) ?? 'A new submission requires triage review.',
        timestamp: (payload.timestamp as string) ?? new Date().toISOString(),
        read: false,
        link: `/clinician/triage/${payload.triageId ?? ''}`,
        priority: signalToPriority(payload.signal as string),
      };
    case 'escalation:new':
      return {
        id,
        type: 'ESCALATION',
        title: 'Escalation Alert',
        body: (payload.message as string) ?? 'A patient has been escalated.',
        timestamp: (payload.timestamp as string) ?? new Date().toISOString(),
        read: false,
        link: '/clinician/escalations',
        priority: 'critical',
      };
    case 'submission:new':
      return {
        id,
        type: 'NEW_SUBMISSION',
        title: 'New Patient Submission',
        body: (payload.message as string) ?? 'A patient submitted a new check-in.',
        timestamp: (payload.timestamp as string) ?? new Date().toISOString(),
        read: false,
        link: payload.patientId ? `/clinician/patients/${payload.patientId}` : undefined,
        priority: 'medium',
      };
    case 'draft:ready':
      return {
        id,
        type: 'DRAFT_READY',
        title: 'AI Draft Ready',
        body: (payload.message as string) ?? 'An AI summary is ready for review.',
        timestamp: (payload.timestamp as string) ?? new Date().toISOString(),
        read: false,
        link: payload.patientId
          ? `/clinician/patients/${payload.patientId}/drafts`
          : undefined,
        priority: 'medium',
      };
    case 'session:reminder':
      return {
        id,
        type: 'SESSION_REMINDER',
        title: 'Session Reminder',
        body: (payload.message as string) ?? 'You have an upcoming session.',
        timestamp: (payload.timestamp as string) ?? new Date().toISOString(),
        read: false,
        priority: 'low',
      };
    case 'system':
      return {
        id,
        type: 'SYSTEM',
        title: (payload.title as string) ?? 'System Notice',
        body: (payload.message as string) ?? '',
        timestamp: (payload.timestamp as string) ?? new Date().toISOString(),
        read: false,
        priority: 'low',
      };
    default:
      return null;
  }
}

function signalToPriority(signal?: string): WsNotification['priority'] {
  switch (signal?.toUpperCase()) {
    case 'ELEVATED':
      return 'critical';
    case 'MODERATE':
      return 'high';
    case 'GUARDED':
      return 'medium';
    default:
      return 'low';
  }
}
