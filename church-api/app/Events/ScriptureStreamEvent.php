<?php

namespace App\Events;

use App\Broadcasting\TenantChannel;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Régie → fidèles: show or hide a scripture overlay on the live stream, with
 * the réalisateur's graphic settings. Broadcast immediately (ShouldBroadcastNow)
 * on the public `live` channel for sub-100ms latency.
 */
class ScriptureStreamEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @param  'show'|'hide'  $action
     * @param  array<string, mixed>  $verse  The verse payload (reference/text/…) or [] on hide.
     * @param  array<string, mixed>  $settings  Layout / animation / font / background.
     */
    public function __construct(
        public string $action,
        public array $verse = [],
        public array $settings = [],
    ) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [new TenantChannel('live')];
    }

    public function broadcastAs(): string
    {
        return 'scripture';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'action' => $this->action,
            'verse' => (object) $this->verse,
            'settings' => (object) $this->settings,
            'at' => now()->toIso8601String(),
        ];
    }
}
