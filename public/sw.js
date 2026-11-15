self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let type;
  try {
    type = event.data?.json()?.type;
  } catch {
    return;
  }

  const reminders = {
    task_due: {
      title: 'MY DESK reminder',
      body: 'A task is due today.',
    },
    event_upcoming: {
      title: 'MY DESK reminder',
      body: 'A calendar event starts soon.',
    },
  };
  const reminder = reminders[type];
  if (!reminder) return;

  const appScope = self.registration.scope;
  event.waitUntil(
    self.registration.showNotification(reminder.title, {
      body: reminder.body,
      icon: new URL('icon.svg', appScope).href,
      data: { path: appScope },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const appScope = self.registration.scope;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(
      (clients) => {
        const client = clients.find((candidate) => {
          try {
            const clientUrl = new URL(candidate.url);
            return (
              clientUrl.origin === self.location.origin &&
              clientUrl.pathname.startsWith(new URL(appScope).pathname)
            );
          } catch {
            return false;
          }
        });
        if (client) {
          return client.focus();
        }
        return self.clients.openWindow(appScope);
      },
    ),
  );
});
