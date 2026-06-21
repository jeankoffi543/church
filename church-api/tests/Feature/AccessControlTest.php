<?php

use App\Models\PrayerRequest;
use App\Models\User;
use App\Support\AccessControl;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    foreach (AccessControl::permissions() as $permission) {
        Permission::findOrCreate($permission, 'web');
    }
});

/* ── Super Admin immunity ──────────────────────────────────────────── */

it('grants a super admin every ability without explicit permissions', function () {
    $user = actingAsSuperAdmin();

    expect($user->can('manage_settings'))->toBeTrue()
        ->and($user->can('process_prayers'))->toBeTrue()
        ->and($user->can('a_permission_that_does_not_exist'))->toBeTrue();
});

it('lets a super admin reach a gated route they have no explicit permission for', function () {
    actingAsSuperAdmin();

    $this->getJson('/api/v1/admin/roles')->assertOk();
});

/* ── Permission gating ─────────────────────────────────────────────── */

it('forbids a servant without the required permission', function () {
    actingAsAdminWith(['view_prayers']);

    $this->getJson('/api/v1/admin/roles')
        ->assertForbidden()
        ->assertJsonPath('message', "Accès restreint : Vous n'avez pas les privilèges requis pour accéder à ce département.");
});

it('allows a servant holding either permission of an OR-gated route', function () {
    actingAsAdminWith(['view_prayers']);

    $this->getJson('/api/v1/admin/prayers')->assertOk();
});

it('blocks the prayer status action without process_prayers', function () {
    actingAsAdminWith(['view_prayers']);

    $prayer = PrayerRequest::create([
        'phone' => '+2250700000000',
        'email' => 'x@y.z',
        'category' => 'Santé',
        'message' => 'Priez pour moi',
        'status' => 'new',
    ]);

    $this->patchJson("/api/v1/admin/prayers/{$prayer->id}/status", ['status' => 'praying'])
        ->assertForbidden();
});

/* ── Suspended accounts ────────────────────────────────────────────── */

it('rejects login for a suspended servant', function () {
    User::factory()->suspended()->create([
        'email' => 'suspended@mfm-ficgayo.ci',
        'password' => Hash::make('password'),
    ]);

    $this->postJson('/api/v1/admin/login', [
        'email' => 'suspended@mfm-ficgayo.ci',
        'password' => 'password',
    ])->assertStatus(422)->assertJsonValidationErrors('email');
});

/* ── me() payload ──────────────────────────────────────────────────── */

it('returns roles and permissions in the me payload', function () {
    actingAsAdminWith(['view_prayers', 'process_prayers']);

    $this->getJson('/api/v1/admin/me')
        ->assertOk()
        ->assertJsonPath('data.is_super_admin', false)
        ->assertJsonPath('data.permissions', ['view_prayers', 'process_prayers']);
});

it('flags a super admin and lists every permission in me', function () {
    actingAsSuperAdmin();

    $response = $this->getJson('/api/v1/admin/me')->assertOk();

    expect($response->json('data.is_super_admin'))->toBeTrue()
        ->and($response->json('data.permissions'))->toEqual(AccessControl::permissions());
});

/* ── User management (manage_access) ───────────────────────────────── */

it('creates a servant with assigned groups', function () {
    actingAsSuperAdmin();
    Role::findOrCreate('Intercesseur', 'web');

    $this->postJson('/api/v1/admin/admin-users', [
        'name' => 'Jean Koffi',
        'email' => 'jean@mfm-ficgayo.ci',
        'password' => 'secret-password',
        'is_active' => true,
        'roles' => ['Intercesseur'],
    ])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Jean Koffi')
        ->assertJsonPath('data.roles', ['Intercesseur']);

    $user = User::where('email', 'jean@mfm-ficgayo.ci')->first();
    expect($user->hasRole('Intercesseur'))->toBeTrue()
        ->and(Hash::check('secret-password', $user->password))->toBeTrue();
});

it('forbids user management without manage_access', function () {
    actingAsAdminWith(['manage_sermons']);

    $this->getJson('/api/v1/admin/admin-users')->assertForbidden();
});

it('prevents an admin from deleting their own account', function () {
    $me = actingAsSuperAdmin();

    $this->deleteJson("/api/v1/admin/admin-users/{$me->id}")
        ->assertStatus(422);

    expect(User::find($me->id))->not->toBeNull();
});

it('suspends a servant by toggling is_active', function () {
    actingAsSuperAdmin();
    $servant = User::factory()->create(['is_active' => true]);

    $this->putJson("/api/v1/admin/admin-users/{$servant->id}", ['is_active' => false])
        ->assertOk()
        ->assertJsonPath('data.is_active', false);

    expect($servant->fresh()->is_active)->toBeFalse();
});

/* ── Role management & permission matrix ───────────────────────────── */

it('creates a group with permissions', function () {
    actingAsSuperAdmin();

    $this->postJson('/api/v1/admin/roles', [
        'name' => 'Protocole',
        'permissions' => ['view_cells', 'process_cells'],
    ])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Protocole')
        ->assertJsonPath('data.permissions', ['view_cells', 'process_cells']);
});

it('synchronises the permission matrix for a group', function () {
    actingAsSuperAdmin();
    $role = Role::findOrCreate('Média/Régie', 'web');
    $role->syncPermissions(['manage_live']);

    $this->putJson("/api/v1/admin/roles/{$role->id}/permissions", [
        'permissions' => ['manage_sermons', 'manage_events'],
    ])->assertOk();

    expect($role->fresh()->permissions->pluck('name')->sort()->values()->all())
        ->toEqual(['manage_events', 'manage_sermons']);
});

it('protects the Super Admin group from deletion', function () {
    actingAsSuperAdmin();
    $role = Role::findOrCreate(AccessControl::SUPER_ADMIN, 'web');

    $this->deleteJson("/api/v1/admin/roles/{$role->id}")->assertStatus(422);

    expect(Role::where('name', AccessControl::SUPER_ADMIN)->exists())->toBeTrue();
});

it('exposes the grouped permission catalogue', function () {
    actingAsSuperAdmin();

    $this->getJson('/api/v1/admin/permissions')
        ->assertOk()
        ->assertJsonPath('data.0.category', 'Général')
        ->assertJsonStructure(['data' => [['category', 'permissions' => [['name', 'label']]]]]);
});
