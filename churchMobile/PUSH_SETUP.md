# Push notifications — native setup (CHR-187)

The JS layer is wired (`src/push/*`, `PushManager` in the nav tree). To make push
actually deliver on a device, complete the native Firebase setup below. None of
this could be validated in CI — build and test on a real device.

## Android (FCM)

1. In the [Firebase console](https://console.firebase.google.com), create/select
   a project and add an **Android app** with the package id from
   `android/app/build.gradle` (`applicationId`).
2. Download **`google-services.json`** and drop it in **`android/app/`**.
3. Add the Google Services Gradle plugin:
   - `android/build.gradle` → `buildscript { dependencies { … } }`:
     `classpath("com.google.gms:google-services:4.4.2")`
   - `android/app/build.gradle` (top-level `apply`/`plugins`):
     `apply plugin: "com.google.gms.google-services"`
4. `npm run android` on a device/emulator with Google Play services.

## iOS (APNs)

1. Add an **iOS app** in Firebase; download **`GoogleService-Info.plist`** and add
   it to the Xcode project (Runner target).
2. `cd ios && bundle exec pod install`.
3. In the Apple developer portal, create an **APNs auth key (.p8)** and upload it
   to Firebase → Cloud Messaging.
4. Enable the **Push Notifications** + **Background Modes (Remote notifications)**
   capabilities in Xcode; initialise Firebase in `AppDelegate`.
5. Build on a physical device (push doesn't work on the iOS simulator).

## How it works

- On sign-in, `PushManager` requests permission, gets the FCM token, and registers
  it with **every followed church** (`POST /api/identity/memberships/{tenant}/device`).
- A church admin's campaign (E5) fans out with `tenant_id` + `campaign_id` in the
  data payload; tapping the notification deep-links to that church's home and
  records the open (`POST /api/identity/churches/{tenant}/push/opened`).
- The backend prunes tokens FCM/APNs reject, so stale devices self-clean.
