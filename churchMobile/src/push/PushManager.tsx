import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';

import { markPushOpened, registerDevice } from '../api/identity';
import { useAuth } from '../auth/AuthContext';
import { useActiveChurch } from '../church/ActiveChurchContext';
import { navigateToTab } from '../navigation/navigationRef';
import {
  getDeviceToken,
  getInitialNotification,
  onForegroundMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  requestPushPermission,
  type RemoteMessage,
} from './messaging';

const PLATFORM: 'ios' | 'android' = Platform.OS === 'ios' ? 'ios' : 'android';

/**
 * Wires push notifications (CHR-187): asks permission, registers the FCM token
 * with every followed church, and on a notification tap deep-links to that
 * church's home and records the open. Headless — renders nothing. Mounted inside
 * the authed area so it has the identity token + the followed churches.
 */
export function PushManager(): null {
  const { token } = useAuth();
  const { churches, setActive } = useActiveChurch();
  const [deviceToken, setDeviceToken] = useState<string | null>(null);

  // Deep-link handler kept in a ref so the message listeners never go stale
  // without being re-subscribed.
  const handleOpen = useCallback(
    (message: RemoteMessage | null) => {
      const data = message?.data;
      const tenantId = typeof data?.tenant_id === 'string' ? data.tenant_id : null;
      if (!tenantId) {
        return;
      }
      setActive(tenantId);
      navigateToTab('Home');

      const campaignId = typeof data?.campaign_id === 'string' ? Number(data.campaign_id) : NaN;
      if (token && deviceToken && Number.isFinite(campaignId)) {
        markPushOpened(token, tenantId, campaignId, deviceToken).catch(() => {});
      }
    },
    [token, deviceToken, setActive],
  );
  const handleOpenRef = useRef(handleOpen);
  handleOpenRef.current = handleOpen;

  // Permission + token + message listeners: set up once per sign-in.
  useEffect(() => {
    if (!token) {
      return;
    }
    let unsubRefresh = () => {};
    let unsubForeground = () => {};
    let unsubOpened = () => {};

    (async () => {
      const granted = await requestPushPermission().catch(() => false);
      if (!granted) {
        return;
      }
      try {
        setDeviceToken(await getDeviceToken());
      } catch {
        // token unavailable (no Play services / not configured)
      }

      unsubRefresh = onTokenRefresh(setDeviceToken);
      unsubForeground = onForegroundMessage(message => {
        const title = message.notification?.title ?? 'Nouvelle notification';
        const body = message.notification?.body ?? '';
        Alert.alert(title, body, [
          { text: 'Fermer', style: 'cancel' },
          { text: 'Ouvrir', onPress: () => handleOpenRef.current(message) },
        ]);
      });
      unsubOpened = onNotificationOpenedApp(message => handleOpenRef.current(message));

      const initial = await getInitialNotification();
      if (initial) {
        handleOpenRef.current(initial);
      }
    })();

    return () => {
      unsubRefresh();
      unsubForeground();
      unsubOpened();
    };
  }, [token]);

  // Register the device with each followed church (re-runs when either changes).
  useEffect(() => {
    if (!token || !deviceToken) {
      return;
    }
    let active = true;
    (async () => {
      for (const church of churches) {
        if (!active) {
          return;
        }
        try {
          await registerDevice(token, church.tenant_id, deviceToken, PLATFORM);
        } catch {
          // not following / transient — skip this church
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [token, deviceToken, churches]);

  return null;
}
