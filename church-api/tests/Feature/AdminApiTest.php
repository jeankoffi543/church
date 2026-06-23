<?php

use App\Models\Ministry;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

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
    actingAsSuperAdmin();

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

it('uploads a cover image when creating a ministry', function () {
    Storage::fake('public');
    actingAsSuperAdmin();

    $response = $this->post('/api/v1/admin/ministries', [
        'name' => 'Louange',
        'image' => UploadedFile::fake()->image('cover.jpg'),
    ])->assertCreated();

    $image = $response->json('data.image');
    expect($image)->toStartWith('/storage/ministries/');
    Storage::disk('public')
        ->assertExists(str_replace('/storage/', '', $image));
});

it('replaces and clears a ministry cover image on update', function () {
    Storage::fake('public');
    actingAsSuperAdmin();

    $created = $this->post('/api/v1/admin/ministries', [
        'name' => 'Médias',
        'image' => UploadedFile::fake()->image('a.jpg'),
    ])->assertCreated();
    $id = $created->json('data.id');

    // Remove the image via the flag.
    $this->post("/api/v1/admin/ministries/{$id}", [
        '_method' => 'PUT',
        'remove_image' => '1',
    ])->assertOk()->assertJsonPath('data.image', null);
});

it('validates ministry creation', function () {
    actingAsSuperAdmin();

    $this->postJson('/api/v1/admin/ministries', [])
        ->assertStatus(422)
        ->assertJsonValidationErrors('name');
});

it('auto-generates a unique slug for events', function () {
    actingAsSuperAdmin();

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
    actingAsSuperAdmin();

    $this->putJson('/api/v1/admin/settings', [
        'settings' => [
            ['key' => 'live_status', 'value' => true, 'group' => 'live'],
            ['key' => 'hero_title', 'value' => 'Nouvelle saison', 'group' => 'general'],
        ],
    ])->assertOk();

    expect(Setting::get('live_status'))->toBeTrue();
    expect(Setting::get('hero_title'))->toBe('Nouvelle saison');
});

it('accepts a Facebook live URL as the stream source', function () {
    actingAsSuperAdmin();

    $this->putJson('/api/v1/admin/settings', [
        'settings' => [
            ['key' => 'live_embed_url', 'value' => 'https://www.facebook.com/MFMFicgayo/videos/123456789', 'group' => 'live'],
        ],
    ])->assertOk();

    expect(Setting::get('live_embed_url'))->toBe('https://www.facebook.com/MFMFicgayo/videos/123456789');
});

it('rejects a non-embeddable stream URL', function () {
    actingAsSuperAdmin();

    $this->putJson('/api/v1/admin/settings', [
        'settings' => [
            ['key' => 'live_embed_url', 'value' => 'https://example.com/whatever', 'group' => 'live'],
        ],
    ])->assertStatus(422)->assertJsonValidationErrors('settings.0.value');
});
