<?php

use App\Models\Ministry;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

it('blocks admin routes without a token', function () {
    $this->getJson('/api/v1/admin/ministries')->assertUnauthorized();
    $this->postJson('/api/v1/admin/ministries', [])->assertUnauthorized();
});

it('returns 401 json even without an Accept header', function () {
    $this->get('/api/v1/admin/ministries')
        ->assertUnauthorized()
        ->assertJson(['message' => 'Unauthenticated.']);
});

it('authenticates and issues a token', function () {
    User::factory()->create([
        'email' => 'admin@mfm-ficgayo.ci',
        'password' => Hash::make('password'),
    ]);

    $this->postJson('/api/v1/admin/login', [
        'email' => 'admin@mfm-ficgayo.ci',
        'password' => 'password',
    ])
        ->assertOk()
        ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email']]);
});

it('rejects invalid credentials', function () {
    User::factory()->create(['email' => 'admin@mfm-ficgayo.ci', 'password' => Hash::make('password')]);

    $this->postJson('/api/v1/admin/login', [
        'email' => 'admin@mfm-ficgayo.ci',
        'password' => 'wrong',
    ])->assertStatus(422);
});

it('creates a ministry when authenticated', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->postJson('/api/v1/admin/ministries', [
        'name' => 'Intercession',
        'description' => 'Veiller dans la prière.',
        'schedule' => 'Mardi · 5h00',
    ])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Intercession')
        ->assertJsonPath('data.initial', 'I');

    expect(Ministry::where('name', 'Intercession')->exists())->toBeTrue();
});

it('validates ministry creation', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->postJson('/api/v1/admin/ministries', [])
        ->assertStatus(422)
        ->assertJsonValidationErrors('name');
});

it('auto-generates a unique slug for events', function () {
    Sanctum::actingAs(User::factory()->create());

    $first = $this->postJson('/api/v1/admin/events', [
        'title' => 'Maison de Feu',
        'starts_at' => '2026-07-11 09:00:00',
    ])->assertCreated();

    $second = $this->postJson('/api/v1/admin/events', [
        'title' => 'Maison de Feu',
        'starts_at' => '2026-07-12 09:00:00',
    ])->assertCreated();

    expect($first->json('data.slug'))->toBe('maison-de-feu');
    expect($second->json('data.slug'))->toBe('maison-de-feu-2');
});

it('bulk updates settings', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->putJson('/api/v1/admin/settings', [
        'settings' => [
            ['key' => 'live_status', 'value' => true, 'group' => 'live'],
            ['key' => 'hero_title', 'value' => 'Nouvelle saison', 'group' => 'general'],
        ],
    ])->assertOk();

    expect(Setting::get('live_status'))->toBeTrue();
    expect(Setting::get('hero_title'))->toBe('Nouvelle saison');
});
