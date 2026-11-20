// Chatty Service Worker for Push Notifications and Deep-Linking

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || "Chatty";
    const options = {
      body: payload.body || "You have a new alert",
      icon: "/chatty-favicon.png",
      badge: "/chatty-favicon.png",
      tag: payload.tag || `chatty-notif-${Date.now()}`,
      data: payload.data || {},
      renotify: true,
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification("Chatty", {
        body: text || "You have a new message",
        icon: "/chatty-favicon.png",
      }),
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = "/";

  if (data.peerId) {
    targetUrl = `/?user=${encodeURIComponent(data.peerId)}`;
  } else if (data.groupId) {
    targetUrl = `/?group=${encodeURIComponent(data.groupId)}`;
  } else if (data.callId) {
    targetUrl = "/?tab=calls";
  } else if (data.requestId) {
    targetUrl = "/?tab=requests";
  } else if (data.category === "security") {
    targetUrl = "/profile";
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url && "focus" in client) {
            client.postMessage({
              type: "CHATTY_NOTIFICATION_CLICK",
              data,
            });
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});
