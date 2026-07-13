import { createNavigationContainerRef } from '@react-navigation/native';

import type { AppStackParamList, AppTabParamList } from './types';

/** Lets non-screen code (the push handler) navigate on a notification tap (CHR-187). */
export const navigationRef = createNavigationContainerRef<AppStackParamList>();

/** Focus a tab inside the nested tab navigator. */
export function navigateToTab(tab: keyof AppTabParamList): void {
  if (navigationRef.isReady()) {
    (navigationRef.navigate as unknown as (name: string, params?: object) => void)('Tabs', { screen: tab });
  }
}
