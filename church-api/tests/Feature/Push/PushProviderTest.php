<?php

use App\Services\Push\ApnsProvider;
use App\Services\Push\FcmProvider;
use App\Services\Push\LogPushProvider;
use App\Services\Push\PushManager;
use App\Services\Push\PushMessage;
use Illuminate\Support\Facades\Http;

// CHR-169: the push transport layer — FCM (HTTP v1), APNS (.p8 token), a dev log
// provider, and a manager that routes per platform.

it('logs and reports every token delivered', function () {
    $result = (new LogPushProvider)->send(new PushMessage('Bonjour', 'Culte ce soir'), ['t1', 't2']);

    expect($result->delivered)->toBe(['t1', 't2'])
        ->and($result->failureCount())->toBe(0);
});

it('sends an FCM v1 notification per token', function () {
    Http::fake(['fcm.googleapis.com/*' => Http::response(['name' => 'projects/x/messages/1'], 200)]);

    $result = (new FcmProvider('my-project', 'oauth-token'))
        ->send(new PushMessage('Titre', 'Corps', ['url' => '/live']), ['tok-a', 'tok-b']);

    expect($result->successCount())->toBe(2);
    Http::assertSent(fn ($req) => str_contains($req->url(), 'projects/my-project/messages:send')
        && $req->hasHeader('Authorization', 'Bearer oauth-token')
        && data_get($req->data(), 'message.notification.title') === 'Titre'
        && data_get($req->data(), 'message.data.url') === '/live');
});

it('marks failed FCM tokens', function () {
    Http::fake(['fcm.googleapis.com/*' => Http::response(['error' => 'UNREGISTERED'], 404)]);

    $result = (new FcmProvider('p', 't'))->send(new PushMessage('a', 'b'), ['bad-token']);

    expect($result->failureCount())->toBe(1)->and($result->successCount())->toBe(0);
});

it('sends an APNS request per token with the .p8 JWT and topic', function () {
    Http::fake(['api.push.apple.com/*' => Http::response('', 200)]);

    $result = (new ApnsProvider(['bundle_id' => 'com.church.app', 'jwt' => 'jwt-token']))
        ->send(new PushMessage('Titre', 'Corps'), ['device-1']);

    expect($result->successCount())->toBe(1);
    Http::assertSent(fn ($req) => str_contains($req->url(), '/3/device/device-1')
        && $req->hasHeader('apns-topic', 'com.church.app')
        && $req->hasHeader('authorization', 'bearer jwt-token'));
});

it('defaults to the log provider and fans out grouped by platform', function () {
    config(['push.default' => 'log']);
    $manager = new PushManager;

    expect($manager->provider('ios'))->toBeInstanceOf(LogPushProvider::class);

    $result = $manager->send(new PushMessage('t', 'b'), [
        (object) ['device_token' => 'a', 'platform' => 'ios'],
        (object) ['device_token' => 'b', 'platform' => 'android'],
    ]);

    expect($result->successCount())->toBe(2);
});

it('routes live traffic to APNS for iOS and FCM otherwise', function () {
    config(['push.default' => 'live']);
    $manager = new PushManager;

    expect($manager->provider('ios'))->toBeInstanceOf(ApnsProvider::class)
        ->and($manager->provider('android'))->toBeInstanceOf(FcmProvider::class);
});
