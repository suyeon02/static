import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeVapidPublicKey, supportsWebPush } from './pushNotifications.js';

test('decodes a URL-safe VAPID public key into its binary application key', () => {
  assert.deepEqual([...decodeVapidPublicKey('AQIDBA')], [1, 2, 3, 4]);
});

test('requires a secure context and the browser push APIs', () => {
  const browser = {
    isSecureContext: true,
    Notification: {},
    navigator: { serviceWorker: {} },
    PushManager: {},
  };
  assert.equal(supportsWebPush(browser), true);
  assert.equal(supportsWebPush({ ...browser, isSecureContext: false }), false);
  assert.equal(supportsWebPush({ isSecureContext: true }), false);
});
