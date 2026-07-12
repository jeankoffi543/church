<?php

declare(strict_types=1);

namespace App\Services\Push\Contracts;

use App\Services\Push\PushManager;
use App\Services\Push\PushMessage;
use App\Services\Push\PushResult;

/**
 * A push transport (CHR-169): FCM, APNS, or the dev log. One provider serves one
 * platform family; {@see PushManager} routes tokens to it.
 */
interface PushProvider
{
    /**
     * @param  list<string>  $tokens
     */
    public function send(PushMessage $message, array $tokens): PushResult;
}
