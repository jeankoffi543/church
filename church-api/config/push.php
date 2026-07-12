<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Push driver (CHR-169)
    |--------------------------------------------------------------------------
    | `log` (default) writes notifications to the log — no real FCM/APNS needed,
    | so the whole Push Hub is exercisable in dev/CI. `live` sends for real:
    | iOS → APNS, Android/web → FCM.
    */
    'default' => env('PUSH_DRIVER', 'log'),

    // Firebase Cloud Messaging, HTTP v1. The access token is an OAuth2 bearer
    // minted from the service account (google/auth or a cached token) — kept out
    // of this file so the provider stays credential-agnostic.
    'fcm' => [
        'project_id' => env('FCM_PROJECT_ID'),
        'access_token' => env('FCM_ACCESS_TOKEN'),
    ],

    // Apple Push Notification service, token (.p8) auth. `jwt` is the ES256 token
    // signed from team_id / key_id / the p8 private key.
    'apns' => [
        'host' => env('APNS_HOST', 'https://api.push.apple.com'),
        'bundle_id' => env('APNS_BUNDLE_ID'),
        'team_id' => env('APNS_TEAM_ID'),
        'key_id' => env('APNS_KEY_ID'),
        'jwt' => env('APNS_JWT'),
    ],

];
