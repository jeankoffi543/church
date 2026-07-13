<?php

use Illuminate\Console\Scheduling\Schedule;

// CHR-161: currencies live in each tenant's own DB, so the nightly rate sync must
// run FOR EVERY tenant (via stancl's `tenants:run`) — a central run would update
// no church's rates.

it('schedules the currency sync to run for every tenant', function () {
    $commands = collect(app(Schedule::class)->events())
        ->map(fn ($event) => $event->command ?? '')
        ->implode("\n");

    expect($commands)->toContain('tenants:run currency:sync-rates');
});

it('schedules nightly per-tenant backups (CHR-190)', function () {
    $commands = collect(app(Schedule::class)->events())
        ->map(fn ($event) => $event->command ?? '')
        ->implode("\n");

    expect($commands)->toContain('tenants:backup');
});
