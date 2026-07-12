<?php

use App\Enums\QueueName;
use App\Jobs\IncrementVideoView;
use App\Jobs\SendDonationReceipt;
use App\Models\Donation;
use Illuminate\Support\Facades\Queue;

// CHR-159: jobs are split by workload onto named queues so heavy work never
// blocks latency-sensitive work; ONE global fleet drains them (the tenant is
// restored per job by stancl's QueueTenancyBootstrapper).

it('routes the donation receipt e-mail onto the mail queue', function () {
    Queue::fake();

    SendDonationReceipt::dispatch(Donation::factory()->make());

    Queue::assertPushedOn(QueueName::Mail->value, SendDonationReceipt::class);
});

it('routes the video-view increment onto the default queue', function () {
    Queue::fake();

    IncrementVideoView::dispatch(1);

    Queue::assertPushedOn(QueueName::Default->value, IncrementVideoView::class);
});

it('defines every workload queue', function () {
    expect(array_map(fn (QueueName $q): string => $q->value, QueueName::cases()))
        ->toBe(['default', 'mail', 'media', 'push', 'broadcast']);
});
