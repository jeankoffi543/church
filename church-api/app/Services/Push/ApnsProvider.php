<?php

declare(strict_types=1);

namespace App\Services\Push;

use App\Services\Push\Contracts\PushProvider;
use Illuminate\Support\Facades\Http;

/**
 * Apple Push Notification service (CHR-169), token-based (.p8) auth. The ES256 JWT
 * (team id / key id / p8) is minted out of band and passed in — the PushManager
 * wires it from config; this class builds and sends the HTTP/2 request per token.
 */
final class ApnsProvider implements PushProvider
{
    /**
     * @param  array{host?: string, bundle_id?: string, jwt?: string}  $config
     */
    public function __construct(private array $config) {}

    public function send(PushMessage $message, array $tokens): PushResult
    {
        $host = $this->config['host'] ?? 'https://api.push.apple.com';
        $bundleId = (string) ($this->config['bundle_id'] ?? '');
        $jwt = (string) ($this->config['jwt'] ?? '');
        $delivered = [];
        $failed = [];

        foreach ($tokens as $token) {
            $response = Http::withHeaders([
                'authorization' => "bearer {$jwt}",
                'apns-topic' => $bundleId,
                'apns-push-type' => 'alert',
            ])->post("{$host}/3/device/{$token}", [
                'aps' => ['alert' => ['title' => $message->title, 'body' => $message->body]],
                ...$message->data,
            ]);

            $response->successful() ? $delivered[] = $token : $failed[] = $token;
        }

        return new PushResult($delivered, $failed);
    }
}
