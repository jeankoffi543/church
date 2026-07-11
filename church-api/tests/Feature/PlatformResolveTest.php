<?php

use App\Enums\TenantStatus;
use App\Models\Tenant;

/*
| CHR-144 — the public domain → tenant resolver the Next.js proxy calls to route
| and gate a request. (The global Feature beforeEach maps `localhost` to an
| active tenant.)
*/

it('resolves a known active domain', function () {
    $tenant = Tenant::query()->firstOrFail();

    $this->getJson('/api/platform/resolve?domain=localhost')
        ->assertOk()
        ->assertJsonPath('tenant_id', $tenant->id)
        ->assertJsonPath('active', true);
});

it('404s an unknown domain', function () {
    $this->getJson('/api/platform/resolve?domain=nope.example.test')->assertNotFound();
});

it('requires a domain', function () {
    $this->getJson('/api/platform/resolve')->assertStatus(422);
});

it('reports a suspended tenant as not servable', function () {
    Tenant::query()->firstOrFail()->update(['status' => TenantStatus::Suspended]);

    $this->getJson('/api/platform/resolve?domain=localhost')
        ->assertOk()
        ->assertJsonPath('active', false);
});
