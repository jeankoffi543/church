<?php

use App\Models\Identity;
use App\Models\Member;
use App\Models\Membership;
use App\Models\Tenant;
use Laravel\Sanctum\Sanctum;

// CHR-166: an identity follows churches, claims its own local member record, and
// controls the follow's privacy.

function actingAsIdentity(?Identity $identity = null): Identity
{
    $identity ??= Identity::factory()->create();
    Sanctum::actingAs($identity, ['identity'], 'identity');

    return $identity;
}

it('follows a church and lists it', function () {
    actingAsIdentity();
    $tenant = Tenant::first();

    $this->postJson("/api/identity/memberships/{$tenant->id}/follow")
        ->assertCreated()
        ->assertJsonPath('data.status', 'follower')
        ->assertJsonPath('data.is_claimed', false)
        // CHR-186: the church's hostname rides along so the mobile Hub can reach
        // that church's public API.
        ->assertJsonPath('data.domain', 'localhost')
        ->assertJsonStructure(['data' => ['tenant_id', 'church', 'slug', 'domain', 'status']]);

    $this->getJson('/api/identity/memberships')
        ->assertOk()
        ->assertJsonPath('data.0.tenant_id', $tenant->id)
        ->assertJsonPath('data.0.domain', 'localhost');
});

it('toggles the privacy of a follow', function () {
    $identity = actingAsIdentity();
    $tenant = Tenant::first();
    Membership::factory()->for($identity)->create(['tenant_id' => $tenant->id]);

    $this->patchJson("/api/identity/memberships/{$tenant->id}", ['is_public' => false])
        ->assertOk()
        ->assertJsonPath('data.is_public', false);
});

it('unfollows a church', function () {
    $identity = actingAsIdentity();
    $tenant = Tenant::first();
    Membership::factory()->for($identity)->create(['tenant_id' => $tenant->id]);

    $this->deleteJson("/api/identity/memberships/{$tenant->id}")->assertOk();

    expect($identity->memberships()->count())->toBe(0);
});

it('claims a matching local member', function () {
    actingAsIdentity(Identity::factory()->create(['email' => 'jean@example.com']));
    $tenant = Tenant::first();
    $member = Member::factory()->create(['email' => 'jean@example.com']);

    $this->postJson("/api/identity/memberships/{$tenant->id}/claim")
        ->assertOk()
        ->assertJsonPath('data.status', 'member')
        ->assertJsonPath('data.is_claimed', true);

    expect(Membership::first()->local_member_id)->toBe($member->id);
});

it('rejects a claim when no local member matches', function () {
    actingAsIdentity(Identity::factory()->create(['email' => 'nobody@example.com']));
    $tenant = Tenant::first();

    $this->postJson("/api/identity/memberships/{$tenant->id}/claim")->assertNotFound();
});

it('rejects claiming a member already claimed by another identity', function () {
    $tenant = Tenant::first();
    $member = Member::factory()->create(['email' => 'shared@example.com']);
    Membership::factory()->claimed($member->id)->create(['tenant_id' => $tenant->id]);

    actingAsIdentity(Identity::factory()->create(['email' => 'shared@example.com']));

    $this->postJson("/api/identity/memberships/{$tenant->id}/claim")->assertStatus(409);
});
