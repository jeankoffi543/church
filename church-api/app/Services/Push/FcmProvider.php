<?php

declare(strict_types=1);

namespace App\Services\Push;

use App\Services\Push\Contracts\PushProvider;
use Illuminate\Support\Facades\Http;

/**
 * Firebase Cloud Messaging, HTTP v1 (CHR-169). Delivers to Android, web, and iOS
 * (via FCM). Auth is an OAuth2 bearer minted from the service account — obtained
 * out of band and passed in here (the PushManager wires it from config); this
 * class only builds and sends the v1 request so it stays trivially testable.
 */
final class FcmProvider implements PushProvider
{
    public function __construct(
        private string $projectId,
        private string $accessToken,
    ) {}

    public function send(PushMessage $message, array $tokens): PushResult
    {
        $endpoint = "https://fcm.googleapis.com/v1/projects/{$this->projectId}/messages:send";
        $delivered = [];
        $failed = [];

        foreach ($tokens as $token) {
            $response = Http::withToken($this->accessToken)->post($endpoint, [
                'message' => [
                    'token' => $token,
                    'notification' => ['title' => $message->title, 'body' => $message->body],
                    'data' => array_map('strval', $message->data),
                ],
            ]);

            $response->successful() ? $delivered[] = $token : $failed[] = $token;
        }

        return new PushResult($delivered, $failed);
    }
}
