<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Refresh store currency exchange rates from a live FX feed every night. Currencies
// live in each tenant's own database (CHR-161), so run the command FOR EVERY tenant
// (stancl's `tenants:run` switches context per tenant) — a central run would touch
// no church's rates. `withoutOverlapping` guards a slow night's run from stacking.
Schedule::command('tenants:run currency:sync-rates')
    ->dailyAt('03:00')
    ->withoutOverlapping();
