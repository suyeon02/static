export function supportsWebPush(environment = globalThis) {
  return Boolean(
    environment.isSecureContext &&
      environment.Notification &&
      environment.navigator?.serviceWorker &&
      environment.PushManager,
  );
}

export function decodeVapidPublicKey(value) {
  if (typeof value !== 'string' || !value) {
    throw new Error('Web Push 공개 키가 설정되어 있지 않습니다.');
  }

  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}
