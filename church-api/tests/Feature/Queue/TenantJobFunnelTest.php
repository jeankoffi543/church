<?php

use App\Jobs\IncrementVideoView;
use App\Jobs\Middleware\LimitPerTenant;
use App\Jobs\SendDonationReceipt;
use App\Models\Donation;

// CHR-160: anti-noisy-neighbor. Every tenant job is funnelled per church so one
// church's burst can't monopolise the global worker fleet.

it('lets a job through untouched when there is no tenant context', function () {
    $ran = false;

    (new LimitPerTenant)->handle(new stdClass, function () use (&$ran): void {
        $ran = true;
    });

    // Central (no-tenant) jobs — e.g. Horizon's own — must never be funnelled.
    expect($ran)->toBeTrue();
});

it('funnels the queued jobs through the per-tenant limiter', function () {
    expect((new SendDonationReceipt(Donation::factory()->make()))->middleware())
        ->toHaveCount(1)
        ->and((new SendDonationReceipt(Donation::factory()->make()))->middleware()[0])
        ->toBeInstanceOf(LimitPerTenant::class);

    expect((new IncrementVideoView(1))->middleware())
        ->toHaveCount(1)
        ->and((new IncrementVideoView(1))->middleware()[0])
        ->toBeInstanceOf(LimitPerTenant::class);
});
