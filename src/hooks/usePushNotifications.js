import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { decodeVapidPublicKey, supportsWebPush } from '../lib/pushNotifications';
import { getLocalizedErrorMessage } from '../lib/userFacingError';

const EMPTY_STATE = {
  userId: null,
  supported: false,
  enabled: false,
  permission: 'default',
  loading: false,
  error: '',
  status: '',
};

function getErrorMessage(error) {
  return getLocalizedErrorMessage(error, '다시 시도해 주세요.');
}

function stateForUser(current, userId) {
  return current.userId === userId ? current : { ...EMPTY_STATE, userId };
}

export default function usePushNotifications(userId) {
  const [state, setState] = useState(EMPTY_STATE);
  const currentUserId = useRef(userId);

  useEffect(() => {
    currentUserId.current = userId;
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      return () => {
        cancelled = true;
      };
    }

    const supported = supportsWebPush();
    if (!supported) {
      return () => {
        cancelled = true;
      };
    }

    const loadSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.register(
          `${import.meta.env.BASE_URL}sw.js`,
        );
        const subscription = await registration.pushManager.getSubscription();
        let enabled = false;

        if (subscription) {
          const { data, error } = await supabase
            .from('push_subscriptions')
            .select('id, time_zone')
            .eq('endpoint', subscription.endpoint)
            .maybeSingle();
          if (error) throw error;
          enabled = Boolean(data);
          const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          if (data && timeZone && data.time_zone !== timeZone) {
            const { error: updateError } = await supabase
              .from('push_subscriptions')
              .update({ time_zone: timeZone })
              .eq('id', data.id);
            if (updateError) throw updateError;
          }
        }

        if (!cancelled) {
          setState((current) => ({
            ...stateForUser(current, userId),
            userId,
            supported,
            enabled,
            permission: Notification.permission,
            loading: false,
            error: '',
            status: enabled
              ? 'Push reminders are enabled on this device.'
              : '',
          }));
        }
      } catch (error) {
        if (!cancelled) {
          setState((current) => ({
            ...stateForUser(current, userId),
            userId,
            supported,
            enabled: false,
            loading: false,
            error: `푸시 알림 상태를 불러오지 못했습니다: ${getErrorMessage(error)}`,
          }));
        }
      }
    };

    void loadSubscription();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const enable = useCallback(async () => {
    if (!userId || !supportsWebPush()) return;
    setState((current) => ({
      ...stateForUser(current, userId),
      userId,
      loading: true,
      error: '',
      status: '',
    }));

    try {
      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }
      if (permission !== 'granted') {
        throw new Error(
          permission === 'denied'
            ? '브라우저 설정에서 이 사이트의 알림이 차단되어 있습니다. 알림을 허용한 뒤 다시 시도해 주세요.'
            : '알림 권한이 허용되지 않았습니다.',
        );
      }

      const publicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY;
      const applicationServerKey = decodeVapidPublicKey(publicKey);
      const registration = await navigator.serviceWorker.register(
        `${import.meta.env.BASE_URL}sw.js`,
      );
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      if (currentUserId.current !== userId) {
        throw new Error('로그인 계정이 변경되었습니다. 다시 시도해 주세요.');
      }

      const keys = subscription.toJSON().keys;
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!keys?.p256dh || !keys.auth || !timeZone) {
        throw new Error('브라우저에서 푸시 알림 구독 정보를 모두 가져오지 못했습니다.');
      }

      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh: keys.p256dh,
          auth_key: keys.auth,
          time_zone: timeZone,
        },
        { onConflict: 'endpoint' },
      );
      if (error?.code === '23505') {
        throw new Error(
          '이 기기는 다른 MY DESK 계정에 연결되어 있습니다. 해당 계정으로 로그인한 뒤 푸시 알림을 먼저 꺼 주세요.',
        );
      }
      if (error) throw error;

      setState((current) => ({
        ...stateForUser(current, userId),
        userId,
        supported: true,
        enabled: true,
        permission,
        loading: false,
        error: '',
        status: 'Push reminders are enabled on this device.',
      }));
    } catch (error) {
      setState((current) => ({
        ...stateForUser(current, userId),
        userId,
        enabled: false,
        supported: supportsWebPush(),
        permission:
          typeof Notification === 'undefined'
            ? 'default'
            : Notification.permission,
        loading: false,
        error: `푸시 알림을 켜지 못했습니다: ${getErrorMessage(error)}`,
        status: '',
      }));
    }
  }, [userId]);

  const disable = useCallback(async () => {
    if (!userId || !supportsWebPush()) return;
    let removedFromServer = false;
    setState((current) => ({
      ...stateForUser(current, userId),
      userId,
      loading: true,
      error: '',
      status: '',
    }));

    try {
      const registration = await navigator.serviceWorker.getRegistration(
        import.meta.env.BASE_URL,
      );
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const { error } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint)
          .eq('user_id', userId);
        if (error) throw error;
        removedFromServer = true;
        const unsubscribed = await subscription.unsubscribe();
        if (!unsubscribed) {
          throw new Error('브라우저에서 이 기기의 푸시 알림 구독을 해제하지 못했습니다.');
        }
      }

      setState((current) => ({
        ...stateForUser(current, userId),
        userId,
        enabled: false,
        permission: Notification.permission,
        loading: false,
        error: '',
        status: 'Push reminders are off on this device.',
      }));
    } catch (error) {
      setState((current) => {
        const previous = stateForUser(current, userId);
        return {
          ...previous,
          userId,
          enabled: removedFromServer ? false : previous.enabled,
          loading: false,
          error: `푸시 알림을 끄지 못했습니다: ${getErrorMessage(error)}`,
        };
      });
    }
  }, [userId]);

  const supported = supportsWebPush();
  const visibleState =
    !userId
      ? EMPTY_STATE
      : state.userId === userId
        ? state
        : {
            ...EMPTY_STATE,
            userId,
            supported,
            permission: supported ? Notification.permission : 'default',
            loading: supported,
            status: supported
              ? ''
              : '푸시 알림을 사용하려면 HTTPS 보안 연결과 Web Push를 지원하는 브라우저가 필요합니다.',
          };
  return { ...visibleState, enable, disable };
}
