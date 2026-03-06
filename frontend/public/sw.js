/// Service Worker for Telegram Live Chat notifications
/// This runs in the background and can show notifications
/// even when the tab is not focused.

const SW_VERSION = '1.0.0';

// ── Install / Activate ─────────────────────────────────
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ── Listen for messages from the main thread ───────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, badge, tag, data } = event.data.payload;

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: icon || '/favicon.ico',
        badge: badge || '/favicon.ico',
        tag: tag || 'livechat-msg',
        renotify: true,
        requireInteraction: false,
        data,
      })
    );
  }
});

// ── Notification click → focus existing tab or open new one ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus an already-open tab
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // No open tab — open a new one
      return self.clients.openWindow(targetUrl);
    })
  );
});
