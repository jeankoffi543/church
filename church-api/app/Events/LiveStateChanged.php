<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Broadcast the moment a broadcast goes on/off air, so every open `/live` tab
 * reacts instantly — without polling — to clear the previous live's chat and
 * show the "just ended" notice.
 */
class LiveStateChanged implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public bool $isLive, public string $startedAt = '') {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [new Channel('live')];
    }

    public function broadcastAs(): string
    {
        return 'live.state';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'is_live' => $this->isLive,
            'started_at' => $this->startedAt,
        ];
    }
}
