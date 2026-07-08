<?php

use App\Models\HomeGroup;
use App\Models\Member;

it('rejects an unauthenticated request', function () {
    $this->getJson('/api/v1/admin/members')->assertStatus(401);
});

it('lists members newest first', function () {
    actingAsAdminWith(['view_members']);

    Member::factory()->create(['name' => 'Ancien Fidèle', 'created_at' => now()->subDay()]);
    Member::factory()->create(['name' => 'Nouveau Fidèle', 'created_at' => now()]);

    $this->getJson('/api/v1/admin/members')
        ->assertOk()
        ->assertJsonPath('data.0.name', 'Nouveau Fidèle');
});

it('creates a member attached to a home group', function () {
    actingAsAdminWith(['manage_members']);
    $group = HomeGroup::factory()->create(['name' => 'Cellule Cocody']);

    $this->postJson('/api/v1/admin/members', [
        'name' => 'Jean Koffi',
        'phone' => '+225 07 00 00 00 00',
        'member_type' => 'membre',
        'home_group_id' => $group->id,
    ])->assertCreated()
        ->assertJsonPath('data.name', 'Jean Koffi')
        ->assertJsonPath('data.home_group_name', 'Cellule Cocody');
});

it('applies the DB-level member_type/status defaults when omitted', function () {
    actingAsAdminWith(['manage_members']);

    $this->postJson('/api/v1/admin/members', ['name' => 'Sans Type Ni Statut'])
        ->assertCreated()
        ->assertJsonPath('data.member_type', 'membre')
        ->assertJsonPath('data.status', 'actif');
});

it('rejects creation without the manage_members permission', function () {
    actingAsAdminWith(['view_members']);

    $this->postJson('/api/v1/admin/members', ['name' => 'Jean Koffi'])
        ->assertStatus(403);
});

it('validates gender, member_type and status against their allowed values', function () {
    actingAsAdminWith(['manage_members']);

    $this->postJson('/api/v1/admin/members', [
        'name' => 'Jean Koffi',
        'gender' => 'autre',
        'member_type' => 'inconnu',
        'status' => 'parti',
    ])->assertStatus(422)->assertJsonValidationErrors(['gender', 'member_type', 'status']);
});

it('filters members by status, type and search', function () {
    actingAsAdminWith(['view_members']);

    Member::factory()->create(['name' => 'Alice Actif', 'status' => 'actif', 'member_type' => 'membre']);
    Member::factory()->create(['name' => 'Bob Visiteur', 'status' => 'actif', 'member_type' => 'visiteur']);
    Member::factory()->create(['name' => 'Claire Inactive', 'status' => 'inactif', 'member_type' => 'membre']);

    $this->getJson('/api/v1/admin/members?status__eq=actif&member_type__eq=membre')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Alice Actif');

    $this->getJson('/api/v1/admin/members?search=Bob')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Bob Visiteur');
});

it('detaches a member from its home group without deleting either when the group is removed', function () {
    actingAsAdminWith(['manage_members']);
    $group = HomeGroup::factory()->create();
    $member = Member::factory()->create(['home_group_id' => $group->id]);

    $group->delete();

    expect($member->fresh()->home_group_id)->toBeNull();
});

it('updates and deletes a member', function () {
    actingAsAdminWith(['manage_members']);
    $member = Member::factory()->create(['status' => 'actif']);

    $this->putJson("/api/v1/admin/members/{$member->id}", ['status' => 'inactif'])
        ->assertOk()
        ->assertJsonPath('data.status', 'inactif');

    $this->deleteJson("/api/v1/admin/members/{$member->id}")->assertStatus(204);
    expect(Member::find($member->id))->toBeNull();
});
