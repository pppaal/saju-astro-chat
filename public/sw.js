// Service Worker for Push Notifications
// This handles push notifications when the app is in the background

self.addEventListener("install", (_event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (_event) => {
  _event.waitUntil(self.clients.claim());
});

// Handle push notifications
self.addEventListener("push", (event) => {

  let data = {
    title: "New Notification",
    body: "You have a new notification",
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    tag: "notification",
    requireInteraction: false,
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.message || payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        tag: payload.tag || data.tag,
        data: payload.data || {},
        requireInteraction: payload.requireInteraction || false,
      };
    } catch (error) {
      console.error("Error parsing push notification data:", error);
      data.body = event.data.text();
    }
  }

  const promiseChain = self.registration.showNotification(data.title, {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    requireInteraction: data.requireInteraction,
    vibrate: [200, 100, 200],
  });

  event.waitUntil(promiseChain);
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/notifications";

  const promiseChain = self.clients
    .matchAll({
      type: "window",
      includeUncontrolled: true,
    })
    .then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus();
        }
      }

      // If no window/tab is open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    });

  event.waitUntil(promiseChain);
});

// Handle notification close
self.addEventListener("notificationclose", (_event) => {});
