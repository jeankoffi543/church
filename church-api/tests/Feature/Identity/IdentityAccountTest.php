<?php

use App\Enums\MembershipStatus;
use App\Models\Identity;
use App\Models\Membership;
use App\Models\PushSubscription;
use App\Models\Tenant;
use Laravel\Sanctum\Sanctum;

// CHR-190 — RGPD self-service for a churchgoer's global account: data export and
// full erasure.

function actingAsAccountIdentity(): Identity
{
    $identity = Identity::factory()->create();
    Sanctum::actingAs($identity, ['identity'], 'identity');

    return $identity;
}

it('exports everything held on the identity (RGPD portability)', function () {
    $identity = actingAsAccountIdentity();
    $tenant = Tenant::first();
    Membership::create(['identity_id' => $identity->id, 'tenant_id' => $tenant->id, 'status' => MembershipStatus::Follower, 'is_public' => true]);

    $this->getJson('/api/identity/account/export')
        ->assertOk()
        ->assertJsonPath('data.identity.email', $identity->email)
        ->assertJsonCount(1, 'data.memberships')
        ->assertJsonStructure(['data' => ['identity' => ['id', 'name', 'email'], 'memberships', 'devices', 'exported_at']]);
});

it('erases the account and all linked data (RGPD right to erasure)', function () {
    $identity = actingAsAccountIdentity();
    $tenant = Tenant::first();
    Membership::create(['identity_id' => $identity->id, 'tenant_id' => $tenant->id, 'status' => MembershipStatus::Follower, 'is_public' => true]);
    PushSubscription::create(['identity_id' => $identity->id, 'tenant_id' => $tenant->id, 'device_token' => 'dev-x', 'platform' => 'android', 'topics' => []]);

    $this->deleteJson('/api/identity/account')
        ->assertOk()
        ->assertJsonPath('message', 'Votre compte et vos données ont été supprimés.');

    expect(Identity::query()->whereKey($identity->id)->exists())->toBeFalse()
        ->and(Membership::query()->where('identity_id', $identity->id)->exists())->toBeFalse()
        ->and(PushSubscription::query()->where('device_token', 'dev-x')->exists())->toBeFalse();
});

it('requires an authenticated identity', function () {
    $this->getJson('/api/identity/account/export')->assertUnauthorized();
    $this->deleteJson('/api/identity/account')->assertUnauthorized();
});
