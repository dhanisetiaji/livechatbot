import { useEffect, useRef, useCallback } from 'react';

interface NotifyOptions {
  title: string;
  body: string;
  /** Optional tag to collapse duplicate notifications */
  tag?: string;
  /** Data passed to the SW — used to focus the correct tab on click */
  data?: Record<string, unknown>;
}

/**
 * Browser notification hook.
 *
 * - Requests permission on mount.
 * - Shows a native notification via the Service Worker when
 *   the tab is *not* visible (hidden / minimized / another tab).
 * - Falls back to `new Notification()` if no SW is registered.
 * - Plays a short notification sound.
 */
export function useNotification() {
  const permissionRef = useRef<NotificationPermission>('default');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ── Request permission on mount ──────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    permissionRef.current = Notification.permission;

    if (Notification.permission === 'default') {
      Notification.requestPermission().then((perm) => {
        permissionRef.current = perm;
      });
    }

    // Pre-create a tiny beep so we can play it synchronously later.
    // Using a data-URI so there's no extra file to serve.
    audioRef.current = new Audio(
      'data:audio/wav;base64,UklGRl4FAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YToFAAD//wEAAgADAP7/+/8AAAgABgD6//b/AQANAA0A+P/v/wAAFgAVAPT/5/8AAB8AHQDQ/+H/AAAoACUA7P/a/wAAMQAtAOj/0/8AADoANQDk/8z/AABDAD0A4P/F/wAATABGANz/vv8AAFUATwDY/7f/AABeAFgA1P+x/wAAZQBfAND/q/8AACoAJQDQ/9X/AAD+//z/8P/2/wAA',
    );
    audioRef.current.volume = 0.3;
  }, []);

  // ── Notify ───────────────────────────────────────────────
  const notify = useCallback(({ title, body, tag, data }: NotifyOptions) => {
    // Only show when the tab is hidden (user switched tab / minimized)
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      return;
    }

    if (permissionRef.current !== 'granted') return;

    // Play a subtle sound
    audioRef.current?.play().catch(() => {});

    const payload = {
      title,
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: tag || 'livechat-msg',
      data: { url: window.location.href, ...data },
    };

    // Prefer the SW so notification survives even if the tab is killed
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        payload,
      });
    } else {
      // Fallback — direct Notification (works while tab exists)
      new Notification(title, {
        body,
        icon: payload.icon,
        tag: payload.tag,
      });
    }
  }, []);

  return { notify };
}
