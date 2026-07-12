<?php

namespace App\Events;

use App\Broadcasting\TenantChannel;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ReactionSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public string $type, public int $total) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [new TenantChannel('live')];
    }

    public function broadcastAs(): string
    {
        return 'reaction';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return ['type' => $this->type, 'total' => $this->total];
    }
}
