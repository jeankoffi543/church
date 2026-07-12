<?php

use App\Enums\TenantStatus;
use App\Models\Identity;
use App\Models\Member;
use App\Models\Membership;
use App\Models\Tenant;
use Laravel\Sanctum\Sanctum;

// CHR-167: an identity trades its broad login token for a token SCOPED to one
// church (`tenant:{id}`), which gates the per-church endpoints (least privilege).

it('exchanges a scoped church token for a follower', function () {
    $identity = Identity::factory()->create();
    $tenant = Tenant::first();
    Membership::factory()->for($identity)->create(['tenant_id' => $tenant->id]);
    Sanctum::actingAs($identity, ['identity'], 'identity');

    $this->postJson("/api/identity/churches/{$tenant->id}/token")
        ->assertOk()
        ->assertJsonPath('abilities.0', "tenant:{$tenant->id}")
        ->assertJsonStructure(['token', 'tenant_id']);
});

it('refuses to exchange a token for a church not followed', function () {
    $identity = Identity::factory()->create();
    Sanctum::actingAs($identity, ['identity'], 'identity');

    $this->postJson('/api/identity/churches/'.Tenant::first()->id.'/token')->assertForbidden();
});

it('lets a scoped token reach the church member endpoint', function () {
    $identity = Identity::factory()->create();
    $tenant = Tenant::first();
    Membership::factory()->for($identity)->create(['tenant_id' => $tenant->id]);
    Sanctum::actingAs($identity, ["tenant:{$tenant->id}"], 'identity');

    $this->getJson("/api/identity/churches/{$tenant->id}/member")
        ->assertOk()
        ->assertJsonPath('data.church', $tenant->name);
});

it('blocks the broad identity token from the scoped member endpoint', function () {
    $identity = Identity::factory()->create();
    $tenant = Tenant::first();
    Membership::factory()->for($identity)->create(['tenant_id' => $tenant->id]);
    Sanctum::actingAs($identity, ['identity'], 'identity'); // no tenant ability

    $this->getJson("/api/identity/churches/{$tenant->id}/member")->assertForbidden();
});

it('does not let a token scoped to one church reach another', function () {
    $identity = Identity::factory()->create();
    $other = new Tenant;
    $other->name = 'Autre Église';
    $other->status = TenantStatus::Active;
    $other->setInternal('create_database', false);
    $other->save();

    Sanctum::actingAs($identity, ['tenant:'.Tenant::first()->id], 'identity'); // scoped to the first church

    $this->getJson("/api/identity/churches/{$other->id}/member")->assertForbidden();
});

it('returns the claimed local member profile through a scoped token', function () {
    $identity = Identity::factory()->create(['email' => 'jean@e.co']);
    $tenant = Tenant::first();
    $member = Member::factory()->create(['email' => 'jean@e.co', 'name' => 'Jean Membre']);
    Membership::factory()->for($identity)->claimed($member->id)->create(['tenant_id' => $tenant->id]);
    Sanctum::actingAs($identity, ["tenant:{$tenant->id}"], 'identity');

    $this->getJson("/api/identity/churches/{$tenant->id}/member")
        ->assertOk()
        ->assertJsonPath('data.status', 'member')
        ->assertJsonPath('data.member.name', 'Jean Membre');
});
