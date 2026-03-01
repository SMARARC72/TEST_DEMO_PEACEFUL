// ─── Notification Bell + Panel ──────────────────────────────────────
// Renders in the AppShell header; shows unread count badge and
// a dropdown panel of recent WebSocket notifications.

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useWsStore, type WsNotification } from '@/stores/ws';

export function NotificationBell() {
  const unreadCount = useWsStore((s) => s.unreadCount);
  const notifications = useWsStore((s) => s.notifications);
  const markRead = useWsStore((s) => s.markRead);
  const markAllRead = useWsStore((s) => s.markAllRead);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  function handleNotificationClick(n: WsNotification) {
    markRead(n.id);
    if (n.link) {
      navigate(n.link);
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-md p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-800 z-50"
          role="region"
          aria-label="Notifications"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
              No notifications yet
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-700">
              {notifications.slice(0, 30).map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-left px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors ${
                      !n.read ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <PriorityDot priority={n.priority} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!n.read ? 'font-semibold' : 'font-medium'} text-neutral-900 dark:text-white truncate`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-0.5">
                          {n.body}
                        </p>
                        <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">
                          {formatRelativeTime(n.timestamp)}
                        </p>
                      </div>
                      {!n.read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────

function PriorityDot({ priority }: { priority: WsNotification['priority'] }) {
  const colors = {
    low: 'bg-blue-400',
    medium: 'bg-yellow-400',
    high: 'bg-orange-500',
    critical: 'bg-red-500 animate-pulse',
  };
  return (
    <span
      className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${colors[priority]}`}
      aria-label={`${priority} priority`}
    />
  );
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
