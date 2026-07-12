<?php

namespace App\Jobs;

use App\Enums\QueueName;
use App\Models\PastLive;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Asynchronously bump a broadcast's unique-view counter. Dispatched from the
 * public view endpoint only after the Redis/cache dedup check has passed, so
 * the database write stays off the request's critical path.
 */
class IncrementVideoView implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $pastLiveId)
    {
        $this->onQueue(QueueName::Default->value);
    }

    public function handle(): void
    {
        PastLive::query()->whereKey($this->pastLiveId)->increment('views_count');
    }
}
