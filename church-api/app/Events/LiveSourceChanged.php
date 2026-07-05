<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Broadcast when the live *source* (embed/HLS url) changes while already on air —
 * e.g. the studio starts a fresh Facebook broadcast (new HLS stream) without the
 * live toggling off first. Every open `/live` tab swaps the player source
 * instantly, WITHOUT wiping the chat (that is {@see LiveStateChanged}'s job on a
 * genuine on/off transition).
 */
class LiveSourceChanged implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public string $streamUrl, public string $title = '') {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [new Channel('live')];
    }

    public function broadcastAs(): string
    {
        return 'live.source';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'stream_url' => $this->streamUrl,
            'title' => $this->title,
        ];
    }
}
