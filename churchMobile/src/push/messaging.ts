import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';

/**
 * Thin wrapper over @react-native-firebase/messaging (CHR-187) so the push
 * manager stays testable and the native module lives in one place. Requires the
 * native FCM setup (google-services.json / APNs) — see the CHR-187 PR notes.
 */
export type RemoteMessage = FirebaseMessagingTypes.RemoteMessage;

export async function requestPushPermission(): Promise<boolean> {
  const status = await messaging().requestPermission();
  return (
    status === messaging.AuthorizationStatus.AUTHORIZED ||
    status === messaging.AuthorizationStatus.PROVISIONAL
  );
}

export function getDeviceToken(): Promise<string> {
  return messaging().getToken();
}

export function onTokenRefresh(cb: (token: string) => void): () => void {
  return messaging().onTokenRefresh(cb);
}

export function onForegroundMessage(cb: (message: RemoteMessage) => void): () => void {
  return messaging().onMessage(cb);
}

export function onNotificationOpenedApp(cb: (message: RemoteMessage) => void): () => void {
  return messaging().onNotificationOpenedApp(cb);
}

export function getInitialNotification(): Promise<RemoteMessage | null> {
  return messaging().getInitialNotification();
}
