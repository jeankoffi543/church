<?php

declare(strict_types=1);

namespace App\Services\Push;

/**
 * A push notification to deliver (CHR-169) — provider-agnostic. Providers map it
 * onto their own payload shape (FCM v1 `notification`, APNS `aps`).
 */
final class PushMessage
{
    /**
     * @param  array<string, string>  $data  Silent data payload (deep-link, ids…).
     */
    public function __construct(
        public string $title,
        public string $body,
        public array $data = [],
    ) {}
}
