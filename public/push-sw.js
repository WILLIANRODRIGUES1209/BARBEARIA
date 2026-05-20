self.addEventListener('push', function(event) {
  if (event.data) {
    let data = { title: 'Notificação', body: '' };
    try {
      data = event.data.json();
    } catch(e) {
      data.body = event.data.text();
    }
    
    const options = {
      body: data.body,
      icon: data.icon || '/icon.svg',
      badge: '/icon.svg',
      vibrate: [200, 100, 200, 100, 200, 100, 200],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      },
      requireInteraction: true // keeps the notification until user clicks
    };
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        let client = windowClients[i];
        if (client.url.indexOf('/') !== -1 && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
