<?php

namespace App\Events;

use App\Broadcasting\TenantChannel;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AudienceUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public int $count) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [new TenantChannel('live')];
    }

    public function broadcastAs(): string
    {
        return 'audience';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return ['count' => $this->count];
    }
}
