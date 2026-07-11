<?php

use App\Models\CentralUser;
use App\Models\User;
use App\Support\AccessControl;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

/*
| CHR-138 — the central ("landlord") auth world: platform staff authenticate on
| the `central` guard, completely isolated from tenant church users.
*/

it('logs in a platform super-admin and issues a central token', function () {
    CentralUser::factory()->create([
        'email' => 'boss@platform.test',
        'password' => Hash::make('secret123'),
    ]);

    $this->postJson('/api/platform/login', [
        'email' => 'boss@platform.test',
        'password' => 'secret123',
    ])
        ->assertOk()
        ->assertJsonStructure(['token', 'user' => ['id', 'email', 'role', 'is_super_admin']])
        ->assertJson(['user' => ['is_super_admin' => true]]);
});

it('rejects invalid platform credentials', function () {
    CentralUser::factory()->create(['email' => 'boss@platform.test', 'password' => Hash::make('secret123')]);

    $this->postJson('/api/platform/login', ['email' => 'boss@platform.test', 'password' => 'nope'])
        ->assertStatus(422);
});

it('refuses a suspended platform account', function () {
    CentralUser::factory()->create([
        'email' => 'gone@platform.test',
        'password' => Hash::make('secret123'),
        'is_active' => false,
    ]);

    $this->postJson('/api/platform/login', ['email' => 'gone@platform.test', 'password' => 'secret123'])
        ->assertStatus(422);
});

it('authenticates a central user on the platform guard', function () {
    $admin = CentralUser::factory()->create();
    $token = $admin->createToken('t', ['platform'])->plainTextToken;

    $this->withToken($token)->getJson('/api/platform/me')
        ->assertOk()
        ->assertJson(['data' => ['id' => $admin->id, 'is_super_admin' => true]]);
});

it('rejects a tenant user token on the platform guard', function () {
    $user = User::factory()->create();
    $token = $user->createToken('church')->plainTextToken;

    // Sanctum's guard checks the tokenable against the central_users provider,
    // so a church user's token can never reach the platform back-office.
    $this->withToken($token)->getJson('/api/platform/me')->assertUnauthorized();
});

it('keeps the platform super-admin separate from a church Super Admin', function () {
    $churchAdmin = User::factory()->create();
    $churchAdmin->assignRole(Role::findOrCreate(AccessControl::SUPER_ADMIN, 'web'));

    $platform = CentralUser::factory()->create();

    expect($churchAdmin)->toBeInstanceOf(User::class)->not->toBeInstanceOf(CentralUser::class)
        ->and($platform)->toBeInstanceOf(CentralUser::class)
        ->and(method_exists($platform, 'hasRole'))->toBeFalse() // no Spatie on the central guard
        ->and($platform->isSuperAdmin())->toBeTrue();
});

it('creates a platform super-admin through the console command', function () {
    $this->artisan('platform:create-super-admin', [
        'email' => 'ops@platform.test',
        '--password' => 'secretpass',
    ])->assertSuccessful();

    expect(CentralUser::query()->where('email', 'ops@platform.test')->exists())->toBeTrue();
});
