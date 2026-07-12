<?php

declare(strict_types=1);

namespace App\Services\Push;

use App\Services\Push\Contracts\PushProvider;

/**
 * Routes a push to the right transport per platform (CHR-169) and fans a message
 * out across a set of device subscriptions. In the `log` driver (dev/test) every
 * platform goes to {@see LogPushProvider}; in `live`, iOS → APNS, the rest → FCM.
 */
class PushManager
{
    /** The provider that serves a given device platform. */
    public function provider(string $platform): PushProvider
    {
        if (config('push.default') !== 'live') {
            return new LogPushProvider;
        }

        return $platform === 'ios' ? $this->apns() : $this->fcm();
    }

    /**
     * Fan a message out to a set of subscriptions (each has `device_token` +
     * `platform`), grouping by platform so each transport gets one batch.
     *
     * @param  iterable<object{device_token: string, platform: string}>  $subscriptions
     */
    public function send(PushMessage $message, iterable $subscriptions): PushResult
    {
        $tokensByPlatform = [];

        foreach ($subscriptions as $subscription) {
            $tokensByPlatform[$subscription->platform ?: 'android'][] = $subscription->device_token;
        }

        $result = new PushResult;

        foreach ($tokensByPlatform as $platform => $tokens) {
            $result = $result->merge($this->provider($platform)->send($message, $tokens));
        }

        return $result;
    }

    private function fcm(): FcmProvider
    {
        return new FcmProvider(
            (string) config('push.fcm.project_id'),
            (string) config('push.fcm.access_token'),
        );
    }

    private function apns(): ApnsProvider
    {
        return new ApnsProvider((array) config('push.apns'));
    }
}
