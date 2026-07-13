import { createNavigationContainerRef } from '@react-navigation/native';

import type { AppTabParamList } from './types';

/** Lets non-screen code (the push handler) navigate on a notification tap (CHR-187). */
export const navigationRef = createNavigationContainerRef<AppTabParamList>();

export function navigateTo(name: keyof AppTabParamList): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as never);
  }
}
