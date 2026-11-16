import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const serviceWorkerSource = readFileSync(
  new URL('../../public/sw.js', import.meta.url),
  'utf8',
);

test('shows Korean STATIC reminders for due tasks and upcoming events', async () => {
  const listeners = new Map();
  const notifications = [];
  const self = {
    addEventListener: (type, listener) => listeners.set(type, listener),
    registration: {
      scope: 'https://example.test/static/',
      showNotification: (title, options) => {
        notifications.push({ title, body: options.body });
        return Promise.resolve();
      },
    },
  };
  runInNewContext(serviceWorkerSource, { self, URL });

  for (const type of ['task_due', 'event_upcoming']) {
    let pendingNotification;
    listeners.get('push')({
      data: { json: () => ({ type }) },
      waitUntil: (promise) => {
        pendingNotification = promise;
      },
    });
    await pendingNotification;
  }

  assert.deepEqual(notifications, [
    { title: 'STATIC 알림', body: '오늘 마감인 할 일이 있어요.' },
    { title: 'STATIC 알림', body: '일정 시작 10분 전이에요.' },
  ]);
});
