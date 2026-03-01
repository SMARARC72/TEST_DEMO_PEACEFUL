// ─── Store Tests ─────────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '@/stores/ui';

describe('UI Store', () => {
  beforeEach(() => {
    // Reset store state
    useUIStore.setState({
      sidebarOpen: false,
      toasts: [],
    });
  });

  it('toggles sidebar', () => {
    expect(useUIStore.getState().sidebarOpen).toBe(false);
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(true);
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(false);
  });

  it('sets sidebar directly', () => {
    useUIStore.getState().setSidebar(true);
    expect(useUIStore.getState().sidebarOpen).toBe(true);
    useUIStore.getState().setSidebar(false);
    expect(useUIStore.getState().sidebarOpen).toBe(false);
  });

  it('adds and removes toasts', () => {
    useUIStore.getState().addToast({
      title: 'Test',
      variant: 'success',
      duration: 0, // prevent auto-removal
    });
    expect(useUIStore.getState().toasts).toHaveLength(1);
    expect(useUIStore.getState().toasts[0].title).toBe('Test');

    const id = useUIStore.getState().toasts[0].id;
    useUIStore.getState().removeToast(id);
    expect(useUIStore.getState().toasts).toHaveLength(0);
  });

  it('auto-generates unique toast ids', () => {
    useUIStore.getState().addToast({ title: 'A', variant: 'info', duration: 0 });
    useUIStore.getState().addToast({ title: 'B', variant: 'warning', duration: 0 });
    const ids = useUIStore.getState().toasts.map((t) => t.id);
    expect(new Set(ids).size).toBe(2);
  });
});
