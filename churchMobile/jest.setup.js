/* eslint-env jest */

// AsyncStorage has no native module under jest — back it with an in-memory mock.
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

// Firebase messaging is a native module — stub it (CHR-187).
jest.mock('@react-native-firebase/messaging', () => {
  const noop = () => () => {};
  const messaging = () => ({
    requestPermission: jest.fn(() => Promise.resolve(1)),
    getToken: jest.fn(() => Promise.resolve('fcm-test-token')),
    onTokenRefresh: jest.fn(noop),
    onMessage: jest.fn(noop),
    onNotificationOpenedApp: jest.fn(noop),
    getInitialNotification: jest.fn(() => Promise.resolve(null)),
  });
  messaging.AuthorizationStatus = { NOT_DETERMINED: -1, DENIED: 0, AUTHORIZED: 1, PROVISIONAL: 2 };
  return { __esModule: true, default: messaging };
});
