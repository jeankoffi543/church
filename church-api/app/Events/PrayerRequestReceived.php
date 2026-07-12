<?php

namespace App\Events;

use App\Broadcasting\TenantPrivateChannel;
use App\Models\PrayerRequest;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * A visitor submitted a prayer request: notify the church's back office in real
 * time on its private admin channel (CHR-156), so the dashboard surfaces it
 * without polling. Private + tenant-scoped, so no church sees another's requests.
 */
class PrayerRequestReceived implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public PrayerRequest $prayer) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [new TenantPrivateChannel('admin')];
    }

    public function broadcastAs(): string
    {
        return 'prayer.received';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->prayer->id,
            'name' => $this->prayer->name ?: 'Anonyme',
            'category' => $this->prayer->category,
            'created_at' => $this->prayer->created_at?->toIso8601String(),
        ];
    }
}
