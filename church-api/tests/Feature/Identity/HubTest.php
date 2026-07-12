<?php

use App\Models\Identity;
use App\Models\Membership;
use App\Models\PushSubscription;
use App\Models\Tenant;
use Laravel\Sanctum\Sanctum;

// CHR-168: mobile Hub — discover churches (with a following flag) and link push
// devices to the identity.

function actingAsHubIdentity(?Identity $identity = null): Identity
{
    $identity ??= Identity::factory()->create();
    Sanctum::actingAs($identity, ['identity'], 'identity');

    return $identity;
}

it('discovers churches and flags the ones followed', function () {
    $identity = actingAsHubIdentity();
    $tenant = Tenant::first();
    Membership::factory()->for($identity)->create(['tenant_id' => $tenant->id]);

    $this->getJson('/api/identity/discover')
        ->assertOk()
        ->assertJsonPath('data.0.id', $tenant->id)
        ->assertJsonPath('data.0.following', true);
});

it('registers a device for a followed church and links it to the identity', function () {
    $identity = actingAsHubIdentity();
    $tenant = Tenant::first();
    Membership::factory()->for($identity)->create(['tenant_id' => $tenant->id]);

    $this->postJson("/api/identity/memberships/{$tenant->id}/device", ['device_token' => 'tok-1', 'platform' => 'android'])
        ->assertCreated()
        ->assertJsonPath('data.device_token', 'tok-1');

    expect(PushSubscription::firstWhere('device_token', 'tok-1')->identity_id)->toBe($identity->id);
});

it('refuses to register a device for a church not followed', function () {
    actingAsHubIdentity();
    $tenant = Tenant::first();

    $this->postJson("/api/identity/memberships/{$tenant->id}/device", ['device_token' => 't', 'platform' => 'ios'])
        ->assertForbidden();
});

it('lists and forgets the identity devices', function () {
    $identity = actingAsHubIdentity();
    $tenant = Tenant::first();
    PushSubscription::create([
        'identity_id' => $identity->id,
        'device_token' => 'tok-x',
        'platform' => 'web',
        'tenant_id' => $tenant->id,
        'topics' => [],
    ]);

    $this->getJson('/api/identity/devices')->assertOk()->assertJsonPath('data.0.device_token', 'tok-x');
    $this->postJson('/api/identity/devices/forget', ['device_token' => 'tok-x'])->assertOk()->assertJsonPath('removed', 1);

    expect($identity->pushSubscriptions()->count())->toBe(0);
});
