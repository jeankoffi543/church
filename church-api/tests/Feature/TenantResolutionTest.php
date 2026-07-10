<?php

use App\Enums\TenantStatus;
use App\Models\Tenant;

/*
| CHR-137 — the church API is tenant-scoped: resolved from the Host, refused on
| central/unknown domains, and turned away when the tenant is suspended.
| (The global Feature beforeEach already provisions an active `localhost` tenant.)
*/

it('serves the church API on a known, active tenant domain', function () {
    $this->getJson('http://localhost/api/v1/public/settings')->assertOk();
});

it('returns 404 for a host that maps to no tenant', function () {
    $this->getJson('http://unknown.test/api/v1/public/settings')
        ->assertNotFound()
        ->assertJson(['message' => 'Aucune église ne correspond à cette adresse.']);
});

it('refuses the church API on a central domain', function () {
    $this->getJson('http://central.test/api/v1/public/settings')->assertNotFound();
});

it('turns away a suspended tenant with 403', function () {
    Tenant::query()->firstOrFail()->update(['status' => TenantStatus::Suspended]);

    $this->getJson('http://localhost/api/v1/public/settings')->assertForbidden();
});
