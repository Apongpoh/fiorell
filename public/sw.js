// Service Worker for handling push notifications
self.addEventListener("push", function (event) {
  if (!event.data) {
    return;
  }

  try {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || "/favicon.svg",
      badge: data.badge || "/favicon.svg",
      image: data.image,
      data: data.data || {},
      actions: data.actions || [],
      tag: data.tag,
      requireInteraction: data.requireInteraction || false,
      silent: data.silent || false,
      vibrate: data.silent ? [] : [200, 100, 200],
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
  } catch {
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification("New notification", {
        body: "You have a new notification from Fiorell",
        icon: "/favicon.svg",
        badge: "/favicon.svg",
      })
    );
  }
});

// Handle notification clicks
self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const data = event.notification.data || {};
  let url = "/";

  // Determine URL based on notification type and action
  if (event.action) {
    switch (event.action) {
      case "view_match":
      case "open_matches":
        url = "/matches";
        break;
      case "send_message":
      case "reply":
      case "view_chat":
      case "open_chat":
        url = data.chatId ? `/chat/${data.chatId}` : "/matches";
        break;
      case "view_profile":
        url = data.userId ? `/profile/${data.userId}` : "/dashboard";
        break;
      case "open_discovery":
        url = "/dashboard";
        break;
      case "open_profile":
        url = "/profile";
        break;
      default:
        url = "/dashboard";
    }
  } else {
    // Default click behavior based on notification type
    switch (data.type) {
      case "match":
        url = "/matches";
        break;
      case "message":
        url = data.chatId ? `/chat/${data.chatId}` : "/matches";
        break;
      case "like":
        url = "/dashboard";
        break;
      case "profile_view":
        url = "/profile";
        break;
      default:
        url = "/dashboard";
    }
  }

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        // Check if there's already a window/tab open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(url) && "focus" in client) {
            return client.focus();
          }
        }

        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Handle background sync for offline actions
self.addEventListener("sync", function (event) {
  if (event.tag === "background-sync") {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // Handle any pending notifications or actions
  return Promise.resolve();
}
