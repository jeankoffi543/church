<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'paystack' => [
        'public_key' => env('PAYSTACK_PUBLIC_KEY'),
        'secret_key' => env('PAYSTACK_SECRET_KEY'),
        'currency' => env('PAYSTACK_CURRENCY', 'XOF'),
    ],

    // Self-hosted RTMP→HLS server: the secret stream key OBS must push with.
    // Kept here (env), never in the publicly-readable settings table.
    'rtmp' => [
        'publish_key' => env('RTMP_PUBLISH_KEY'),
    ],

    // SRS media server — translates the studio's WHIP (WebRTC) publish into an
    // internal RTMP stream, which the backend relays to Facebook via ffmpeg.
    'srs' => [
        // Public WHIP endpoint (put SRS's :1985 behind HTTPS — browsers on https
        // can't POST to http). The trailing slash is required — SRS 302-redirects
        // the slashless form, which drops the POST body.
        // e.g. https://media.example.ci/rtc/v1/whip/
        'whip_base' => env('SRS_WHIP_BASE', 'http://127.0.0.1:1985/rtc/v1/whip/'),
        // Internal RTMP the ffmpeg relay pulls the published stream from. Host
        // port 1936 (SRS listens on 1935 inside) so it coexists with nginx-rtmp.
        'rtmp_internal' => env('SRS_RTMP_INTERNAL', 'rtmp://127.0.0.1:1936/live'),
        // SRS application (must match the WHIP url's ?app=…).
        'app' => env('SRS_APP', 'live'),
        // Public WebRTC playback endpoint — the site plays the studio's feed back
        // over WebRTC from here. SRS's NATIVE play API (`/rtc/v1/play/`, JSON), used
        // over the WHEP standard because it's confirmed on this SRS build. Same SRS
        // :1985 as WHIP. Put behind HTTPS in prod (an https page can't POST to http).
        // e.g. https://media.example.ci/rtc/v1/play/
        'whep_base' => env('SRS_WHEP_BASE', 'http://127.0.0.1:1985/rtc/v1/play/'),
    ],

    // Facebook Live ingest. The client's own stream key is appended to this base
    // and stays server-side — never exposed to the browser or a third party.
    'facebook' => [
        'ingest_url' => env('FACEBOOK_INGEST_URL', 'rtmps://live-api-s.facebook.com:443/rtmp/'),
    ],

];
