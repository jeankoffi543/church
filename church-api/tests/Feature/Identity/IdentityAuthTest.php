<?php

use App\Models\CentralUser;
use App\Models\Identity;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

// CHR-165: the global end-user identity realm — register/login on the `identity`
// guard, completely isolated from tenant users and platform staff.

it('registers a new identity and issues a token', function () {
    $this->postJson('/api/identity/register', [
        'name' => 'Koffi',
        'email' => 'koffi@example.com',
        'password' => 'password123',
    ])->assertCreated()
        ->assertJsonStructure(['token', 'identity' => ['id', 'name', 'email']]);

    $identity = Identity::firstWhere('email', 'koffi@example.com');
    expect($identity)->not->toBeNull()
        ->and($identity->password)->not->toBe('password123'); // hashed at rest
});

it('rejects a duplicate email and a weak password', function () {
    Identity::factory()->create(['email' => 'taken@example.com']);

    $this->postJson('/api/identity/register', ['name' => 'x', 'email' => 'taken@example.com', 'password' => 'password123'])
        ->assertStatus(422)->assertJsonValidationErrors('email');

    $this->postJson('/api/identity/register', ['name' => 'x', 'email' => 'new@example.com', 'password' => 'short'])
        ->assertStatus(422)->assertJsonValidationErrors('password');
});

it('logs in with valid credentials and rejects bad ones', function () {
    Identity::factory()->create(['email' => 'a@b.co', 'password' => Hash::make('secret123')]);

    $this->postJson('/api/identity/login', ['email' => 'a@b.co', 'password' => 'secret123'])
        ->assertOk()->assertJsonStructure(['token', 'identity']);

    $this->postJson('/api/identity/login', ['email' => 'a@b.co', 'password' => 'wrong'])
        ->assertStatus(422);
});

it('returns the authenticated identity and revokes the token on logout', function () {
    $token = $this->postJson('/api/identity/register', ['name' => 'Koffi', 'email' => 'k@e.co', 'password' => 'password123'])->json('token');

    $this->withToken($token)->getJson('/api/identity/me')->assertOk()->assertJsonPath('data.email', 'k@e.co');
    $this->withToken($token)->postJson('/api/identity/logout')->assertOk();

    // Production serves each request from a fresh app; the shared test app caches
    // the resolved guard user, so forget guards to re-resolve against the (now
    // deleted) token.
    $this->app['auth']->forgetGuards();
    $this->withToken($token)->getJson('/api/identity/me')->assertUnauthorized();
});

it('isolates the identity guard from the platform and tenant realms', function () {
    // An identity token can never reach platform (central) routes…
    $identityToken = $this->postJson('/api/identity/register', ['name' => 'K', 'email' => 'iso@e.co', 'password' => 'password123'])->json('token');
    $this->withToken($identityToken)->getJson('/api/platform/me')->assertUnauthorized();

    // …a platform staff token can never reach identity routes…
    $centralToken = CentralUser::factory()->create()->createToken('t', ['platform'])->plainTextToken;
    $this->withToken($centralToken)->getJson('/api/identity/me')->assertUnauthorized();

    // …and neither can a tenant user token.
    $tenantToken = User::factory()->create()->createToken('t')->plainTextToken;
    $this->withToken($tenantToken)->getJson('/api/identity/me')->assertUnauthorized();
});
