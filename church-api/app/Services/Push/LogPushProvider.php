<?php

declare(strict_types=1);

namespace App\Services\Push;

use App\Services\Push\Contracts\PushProvider;
use Illuminate\Support\Facades\Log;

/**
 * The default dev/test transport (CHR-169): logs the notification and reports
 * every token delivered, so the Push Hub can be exercised without real FCM/APNS
 * credentials.
 */
final class LogPushProvider implements PushProvider
{
    public function send(PushMessage $message, array $tokens): PushResult
    {
        Log::info('[push] '.$message->title, [
            'body' => $message->body,
            'tokens' => count($tokens),
            'data' => $message->data,
        ]);

        return new PushResult(array_values($tokens), []);
    }
}
