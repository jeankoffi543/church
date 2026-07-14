<?php

use App\Models\HomeGroup;
use App\Models\HomeGroupApplication;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Permission::findOrCreate('validate_home_group_applications', 'web');
});

it('allows a public user to submit a home group application', function () {
    $group = HomeGroup::factory()->create(['name' => 'Cellule Bethel']);

    $response = $this->postJson('/api/v1/public/home-groups/applications', [
        'name' => 'Jean Koffi',
        'email' => 'jean@example.com',
        'phone' => '+22507080910',
        'home_group_id' => $group->id,
        'motivation' => 'Je souhaite rejoindre le groupe Bethel pour grandir spirituellement.',
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('application.name', 'Jean Koffi')
        ->assertJsonPath('application.status', 'pending');

    $this->assertDatabaseHas('home_group_applications', [
        'name' => 'Jean Koffi',
        'email' => 'jean@example.com',
        'phone' => '+22507080910',
        'home_group_id' => $group->id,
        'status' => 'pending',
    ]);
});

it('prevents double application for the same user email or phone', function () {
    $group = HomeGroup::factory()->create(['name' => 'Cellule Bethel']);

    // Create a pending application
    HomeGroupApplication::create([
        'name' => 'Jean Koffi',
        'email' => 'jean@example.com',
        'phone' => '+22507080910',
        'home_group_id' => $group->id,
        'motivation' => 'Motivation 1',
        'status' => 'pending',
    ]);

    // Submit again with same email
    $response = $this->postJson('/api/v1/public/home-groups/applications', [
        'name' => 'Jean Koffi Autre',
        'email' => 'jean@example.com',
        'phone' => '+22507000000',
        'home_group_id' => $group->id,
        'motivation' => 'Motivation 2',
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('status', 'pending');
});

it('allows status verification by email and phone', function () {
    $group = HomeGroup::factory()->create(['name' => 'Cellule Sion']);

    HomeGroupApplication::create([
        'name' => 'Marie Aka',
        'email' => 'marie@example.com',
        'phone' => '+22507070707',
        'home_group_id' => $group->id,
        'motivation' => 'Motivation Marie',
        'status' => 'approved',
    ]);

    $response = $this->postJson('/api/v1/public/home-groups/applications/verify', [
        'email' => 'marie@example.com',
        'phone' => '+22507070707',
    ]);

    $response->assertStatus(200)
        ->assertJsonPath('status', 'approved')
        ->assertJsonPath('home_group_name', 'Cellule Sion');
});

it('restricts admin listing of applications to users with validate_home_group_applications permission', function () {
    $user = User::factory()->create();

    $this->getJson('/api/v1/admin/home-groups/applications')
        ->assertStatus(401); // Unauthenticated

    Sanctum::actingAs($user);

    $this->getJson('/api/v1/admin/home-groups/applications')
        ->assertStatus(403); // Unauthorized (no permission)

    // Now act as an admin with the specific permission
    actingAsAdminWith(['validate_home_group_applications']);

    $this->getJson('/api/v1/admin/home-groups/applications')
        ->assertStatus(200);
});

it('allows only the designated cell leader, pasteur, or super admin to approve or reject application', function () {
    $pastor = User::factory()->create();
    $pastorRole = Role::findOrCreate('Pasteurs', 'web');
    $pastorRole->givePermissionTo('validate_home_group_applications');
    $pastor->assignRole($pastorRole);

    $leader1 = User::factory()->create();
    $leader2 = User::factory()->create();
    $leaderRole = Role::findOrCreate('Responsables de cellule', 'web');
    $leaderRole->givePermissionTo('validate_home_group_applications');
    $leader1->assignRole($leaderRole);
    $leader2->assignRole($leaderRole);

    $group = HomeGroup::factory()->create([
        'leader_id' => $leader1->id,
        'name' => 'Cellule Alpha',
    ]);

    $application = HomeGroupApplication::create([
        'name' => 'Adhérent',
        'email' => 'adherent@example.com',
        'phone' => '+22501010101',
        'home_group_id' => $group->id,
        'motivation' => 'Motivation',
        'status' => 'pending',
    ]);

    // Leader 2 tries to approve (restricted, should return 403)
    Sanctum::actingAs($leader2);
    $this->postJson("/api/v1/admin/home-groups/applications/{$application->id}/approve")
        ->assertStatus(403);

    // Leader 1 tries to approve (allowed)
    Sanctum::actingAs($leader1);
    $this->postJson("/api/v1/admin/home-groups/applications/{$application->id}/approve")
        ->assertStatus(200)
        ->assertJsonPath('data.status', 'approved');

    // Reset status to pending
    $application->update(['status' => 'pending']);

    // Pastor tries to approve (allowed)
    Sanctum::actingAs($pastor);
    $this->postJson("/api/v1/admin/home-groups/applications/{$application->id}/approve")
        ->assertStatus(200)
        ->assertJsonPath('data.status', 'approved');
});
