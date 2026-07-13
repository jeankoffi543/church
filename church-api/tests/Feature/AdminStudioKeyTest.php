<?php

use App\Models\StudioActivation;
use App\Models\Tenant;

/*
| CHR-180 — a church's self-service Studio Live licences: mint / revoke keys for
| its own operators, within the seats its plan grants. Tenant context.
*/

function enableStudio(int $seats = 2): Tenant
{
    $tenant = Tenant::query()->firstOrFail();
    $tenant->update(['studio_enabled' => true, 'studio_seats' => $seats]);

    return $tenant;
}

function seedStudioKey(Tenant $tenant, ?string $revokedAt = null): StudioActivation
{
    return StudioActivation::query()->create([
        'tenant_id' => $tenant->id,
        'key_hash' => hash('sha256', 'k'.uniqid()),
        'key_prefix' => 'chr_live_'.substr(uniqid(), 0, 6),
        'label' => 'Régie principale',
        'revoked_at' => $revokedAt,
    ]);
}

it('lists the studio licences with the seat count', function () {
    actingAsSuperAdmin();
    $tenant = enableStudio(2);
    seedStudioKey($tenant);

    $this->getJson('http://localhost/api/v1/admin/studio/keys')
        ->assertOk()
        ->assertJsonPath('seats', 2)
        ->assertJsonPath('used', 1)
        ->assertJsonStructure(['data' => [['id', 'label', 'key_prefix', 'bound_device', 'revoked_at']], 'seats', 'used']);
});

it('mints a key within the seat limit, shown once', function () {
    actingAsSuperAdmin();
    enableStudio(2);

    $this->postJson('http://localhost/api/v1/admin/studio/keys', ['label' => 'Poste régie'])
        ->assertCreated()
        ->assertJsonStructure(['key', 'activation' => ['id', 'label', 'key_prefix']]);

    expect(StudioActivation::query()->where('label', 'Poste régie')->exists())->toBeTrue();
});

it('refuses to mint beyond the available seats', function () {
    actingAsSuperAdmin();
    $tenant = enableStudio(1);
    seedStudioKey($tenant); // the only seat is taken

    $this->postJson('http://localhost/api/v1/admin/studio/keys', ['label' => 'Deuxième poste'])
        ->assertStatus(422);
});

it('refuses to mint when Studio is not enabled for the church', function () {
    actingAsSuperAdmin();
    Tenant::query()->firstOrFail()->update(['studio_enabled' => false, 'studio_seats' => 0]);

    $this->postJson('http://localhost/api/v1/admin/studio/keys', ['label' => 'Poste'])
        ->assertForbidden();
});

it('revokes a licence belonging to the church', function () {
    actingAsSuperAdmin();
    $tenant = enableStudio(2);
    $key = seedStudioKey($tenant);

    $this->postJson("http://localhost/api/v1/admin/studio/keys/{$key->id}/revoke")->assertOk();

    expect($key->refresh()->revoked_at)->not->toBeNull();
});

it('gates studio licences behind the studio feature', function () {
    actingAsSuperAdmin();
    Tenant::query()->firstOrFail()->update(['features' => ['studio' => false], 'studio_enabled' => true, 'studio_seats' => 2]);

    $this->getJson('http://localhost/api/v1/admin/studio/keys')->assertForbidden();
});
