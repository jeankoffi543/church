# Release builds — Play Store & App Store (CHR-189)

The app is a bare React Native 0.86 project. These are the store-build steps; run
them on a machine with the Android SDK / Xcode. Bump the version first.

## Versioning

- `package.json` → `version`.
- Android: `android/app/build.gradle` → `versionCode` (integer, +1 each release)
  and `versionName` (e.g. `1.0.0`).
- iOS: Xcode target → `CFBundleShortVersionString` + `CFBundleVersion`.

## Configure before releasing

- **API + Reverb**: point `src/config.ts` `API_ORIGIN`, `REVERB` (host/port/scheme
  `wss`) and the Reverb `key` at production — not the `10.0.2.2` dev defaults.
- **Push**: complete `PUSH_SETUP.md` (google-services.json / APNs).

## Android (AAB for Play Store)

1. Generate an upload keystore:
   `keytool -genkeypair -v -keystore upload.keystore -alias upload -keyalg RSA -keysize 2048 -validity 10000`
2. Put it in `android/app/` and add the credentials to
   `android/gradle.properties` (`MYAPP_UPLOAD_STORE_FILE`, `…_KEY_ALIAS`,
   `…_STORE_PASSWORD`, `…_KEY_PASSWORD`); wire the `signingConfigs.release` block
   in `android/app/build.gradle`.
3. `cd android && ./gradlew bundleRelease` → `app/build/outputs/bundle/release/app-release.aab`.
4. Upload the `.aab` to the Play Console.

## iOS (App Store)

1. `cd ios && bundle exec pod install`.
2. Open `ios/churchMobile.xcworkspace` in Xcode; set the Team + a unique bundle id
   and provisioning profile.
3. Product → Archive → Distribute App → App Store Connect.

## Pre-submit checklist

- Real production `API_ORIGIN` / `REVERB` (TLS).
- Push tested on a physical device.
- A test donation completes with Paystack **live** keys (the backend's public key
  is returned per church; ensure the church's Paystack is in live mode).
- App icons + splash set for both platforms.
