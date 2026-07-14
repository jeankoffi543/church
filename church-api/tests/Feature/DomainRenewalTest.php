<?php

use App\Contracts\DomainRegistrar;
use App\Enums\DomainType;
use App\Models\Tenant;
use App\Services\Registrar\StubRegistrar;

/*
| CHR-210 — the domains:renew poller auto-renews platform-registered domains
| (those carrying an expiry) before they lapse; BYO domains are left alone.
*/

it('renews a domain expiring soon and extends its expiry by a year', function () {
    $this->app->instance(DomainRegistrar::class, new StubRegistrar('USD'));
    $expiry = now()->addDays(10);
    $domain = Tenant::first()->domains()->create([
        'domain' => 'soon.org',
        'type' => DomainType::Custom,
        'expires_at' => $expiry,
    ]);

    $this->artisan('domains:renew')->assertSuccessful();

    expect($domain->fresh()->expires_at->toDateString())->toBe($expiry->copy()->addYear()->toDateString());
});

it('leaves far-future domains and BYO (null-expiry) domains untouched', function () {
    $this->app->instance(DomainRegistrar::class, new StubRegistrar('USD'));
    $tenant = Tenant::first();
    $far = $tenant->domains()->create(['domain' => 'far.org', 'type' => DomainType::Custom, 'expires_at' => now()->addMonths(6)]);
    $byo = $tenant->domains()->create(['domain' => 'byo.org', 'type' => DomainType::Custom, 'expires_at' => null]);

    $this->artisan('domains:renew')->assertSuccessful();

    expect($far->fresh()->expires_at->toDateString())->toBe(now()->addMonths(6)->toDateString())
        ->and($byo->fresh()->expires_at)->toBeNull();
});

it('does not extend expiry when the registrar cannot renew (default null driver)', function () {
    $expiry = now()->addDays(5);
    $domain = Tenant::first()->domains()->create([
        'domain' => 'nodriver.org',
        'type' => DomainType::Custom,
        'expires_at' => $expiry,
    ]);

    $this->artisan('domains:renew')->assertSuccessful();

    expect($domain->fresh()->expires_at->toDateString())->toBe($expiry->toDateString());
});
