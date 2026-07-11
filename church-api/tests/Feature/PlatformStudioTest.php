<?php

use App\Models\CentralUser;
use App\Models\StudioActivation;
use App\Models\Tenant;
use App\Models\User;
use App\Support\AccessControl;
use Spatie\Permission\Models\Role;

/*
| CHR-142 — Studio Live activation keys: super-admins mint per-seat `chr_live_*`
| keys; the studio-native app exchanges a key for a short scoped session +
| per-tenant stream credentials.
*/

function studioSuperToken(): string
{
    return CentralUser::factory()->create()->createToken('t', ['platform'])->plainTextToken;
}

function studioTenant(int $seats = 2): Tenant
{
    $tenant = Tenant::query()->firstOrFail();
    $tenant->update(['studio_enabled' => true, 'studio_seats' => $seats]);

    return $tenant;
}

/** Mint a key via the super-admin endpoint and return its plaintext. */
function mintStudioKey(Tenant $tenant, string $label = 'Régie 1'): string
{
    return test()->withToken(studioSuperToken())
        ->postJson("/api/platform/tenants/{$tenant->id}/studio/keys", ['label' => $label])
        ->json('key');
}

it('mints a studio key, shown once and stored only hashed', function () {
    $tenant = studioTenant();

    $response = $this->withToken(studioSuperToken())
        ->postJson("/api/platform/tenants/{$tenant->id}/studio/keys", ['label' => 'Régie 1'])
        ->assertCreated()
        ->assertJsonStructure(['key', 'activation' => ['id', 'key_prefix', 'label']]);

    $key = $response->json('key');
    $activation = StudioActivation::query()->firstOrFail();

    expect($key)->toStartWith('chr_live_')
        ->and($activation->key_hash)->toBe(hash('sha256', $key))
        ->and($activation->key_prefix)->toBe(substr($key, 0, 16))
        ->and($activation->key_prefix)->not->toBe($key); // full key never stored
});

it('refuses to mint a key when the studio feature is off', function () {
    $tenant = Tenant::query()->firstOrFail();
    $tenant->update(['studio_enabled' => false]);

    $this->withToken(studioSuperToken())
        ->postJson("/api/platform/tenants/{$tenant->id}/studio/keys", ['label' => 'x'])
        ->assertForbidden();
});

it('enforces the seat limit', function () {
    $tenant = studioTenant(seats: 1);

    mintStudioKey($tenant, 'Seat 1'); // fills the only seat

    $this->withToken(studioSuperToken())
        ->postJson("/api/platform/tenants/{$tenant->id}/studio/keys", ['label' => 'Seat 2'])
        ->assertStatus(422);
});

it('activates a key into a scoped tenant session with stream credentials', function () {
    $admin = User::factory()->create();
    $admin->assignRole(Role::findOrCreate(AccessControl::SUPER_ADMIN, 'web'));

    $tenant = studioTenant();
    $key = mintStudioKey($tenant);

    $response = $this->postJson('/api/platform/studio/activate', ['key' => $key, 'device_fingerprint' => 'DEV-A'])
        ->assertOk()
        ->assertJsonStructure(['session_token', 'expires_at', 'tenant' => ['id', 'domain'], 'stream' => ['whip_url', 'stream_key']]);

    // The device got bound and the heartbeat recorded.
    expect(StudioActivation::query()->firstOrFail()->device_fingerprint)->toBe('DEV-A')
        ->and(StudioActivation::query()->firstOrFail()->last_seen_at)->not->toBeNull();

    // The minted session token is a real tenant token and drives the admin API.
    $this->withToken($response->json('session_token'))
        ->getJson('http://localhost/api/v1/admin/me')
        ->assertOk()
        ->assertJsonPath('data.id', $admin->id);
});

it('binds a key to a single device', function () {
    $tenant = studioTenant();
    $key = mintStudioKey($tenant);

    $this->postJson('/api/platform/studio/activate', ['key' => $key, 'device_fingerprint' => 'DEV-A'])->assertOk();
    $this->postJson('/api/platform/studio/activate', ['key' => $key, 'device_fingerprint' => 'DEV-B'])->assertForbidden();
    $this->postJson('/api/platform/studio/activate', ['key' => $key, 'device_fingerprint' => 'DEV-A'])->assertOk();
});

it('rejects an activation once the key is revoked', function () {
    $tenant = studioTenant();
    $key = mintStudioKey($tenant);
    $activation = StudioActivation::query()->firstOrFail();

    $this->withToken(studioSuperToken())
        ->postJson("/api/platform/studio/keys/{$activation->id}/revoke")
        ->assertOk();

    $this->postJson('/api/platform/studio/activate', ['key' => $key, 'device_fingerprint' => 'DEV-A'])
        ->assertUnauthorized();
});

it('rejects an activation when studio access has been turned off', function () {
    $tenant = studioTenant();
    $key = mintStudioKey($tenant);

    $tenant->update(['studio_enabled' => false]); // e.g. downgraded plan

    $this->postJson('/api/platform/studio/activate', ['key' => $key])->assertForbidden();
});
