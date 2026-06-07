import { useEffect, useState } from 'react';
import Api from '../Api';
import { useFeatureFlag } from './useFeatureFlag';

const DISMISSED_KEY = 'push:dismissed';

function urlBase64ToUint8Array (base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function registerSubscription (registration) {
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidKey) return null;

  const existing = await registration.pushManager.getSubscription();
  const subscription = existing ?? await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });

  await Api.push.subscribe(subscription.toJSON());
  return subscription;
}

/**
 * Manages the push notification subscription lifecycle for the current user.
 *
 * Returns:
 *   - promptVisible: boolean — true when the opt-in banner should be shown
 *   - permission: NotificationPermission string
 *   - requestPermission(): ask the browser and subscribe on grant
 *   - dismissPrompt(): hide the banner without granting permission
 */
export function usePushNotifications (user) {
  const pushEnabled = useFeatureFlag('push-notifications', { defaultValue: false });

  const [permission, setPermission] = useState(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [promptVisible, setPromptVisible] = useState(false);

  const supported =
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'serviceWorker' in navigator;

  // When the user logs in, either silently re-register an existing subscription
  // or surface the opt-in prompt.
  useEffect(() => {
    if (!user || !supported || pushEnabled !== true) return;

    navigator.serviceWorker.ready.then(async (registration) => {
      const currentPermission = Notification.permission;
      setPermission(currentPermission);

      if (currentPermission === 'granted') {
        // Silently re-register (handles returning users and shared devices).
        await registerSubscription(registration).catch(() => {});
      } else if (
        currentPermission === 'default' &&
        localStorage.getItem(DISMISSED_KEY) !== 'true'
      ) {
        setPromptVisible(true);
      }
    });
  }, [user?.id, pushEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  async function requestPermission () {
    if (!supported) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    setPromptVisible(false);

    if (result === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      await registerSubscription(registration).catch(() => {});
    }
  }

  function dismissPrompt () {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setPromptVisible(false);
  }

  async function unsubscribe () {
    if (!supported) return;
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    if (sub) {
      await Api.push.unsubscribe(sub.endpoint).catch(() => {});
    }
  }

  return {
    permission,
    promptVisible: promptVisible && pushEnabled === true,
    requestPermission,
    dismissPrompt,
    unsubscribe,
  };
}
