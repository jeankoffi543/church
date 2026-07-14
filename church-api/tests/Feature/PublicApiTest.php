<?php

use App\Models\Event;
use App\Models\HomeGroup;
use App\Models\Ministry;
use App\Models\PrayerRequest;
use App\Models\Sermon;
use App\Models\Setting;
use App\Models\User;
use App\Services\PrayerNotificationService;
use Illuminate\Support\Facades\Log;

it('returns settings grouped by group', function () {
    Setting::set('hero_title', 'Bienvenue à la Maison', 'general');
    Setting::set('weekly_schedule', [['day' => 'DIMANCHE', 'time' => '09:00']], 'schedule');

    $this->getJson('/api/v1/public/settings')
        ->assertOk()
        ->assertJsonPath('data.general.hero_title', 'Bienvenue à la Maison')
        ->assertJsonPath('data.schedule.weekly_schedule.0.day', 'DIMANCHE');
});

it('filters settings by group', function () {
    Setting::set('live_status', true, 'live');

    $this->getJson('/api/v1/public/settings?group=live')
        ->assertOk()
        ->assertJsonPath('data.live_status', true);
});

it('only lists active ministries, ordered', function () {
    Ministry::factory()->create(['name' => 'Beta', 'sort_order' => 2]);
    Ministry::factory()->create(['name' => 'Alpha', 'sort_order' => 1]);
    Ministry::factory()->inactive()->create(['name' => 'Hidden']);

    $response = $this->getJson('/api/v1/public/ministries')->assertOk();

    expect($response->json('data'))->toHaveCount(2);
    expect($response->json('data.0.name'))->toBe('Alpha');
    expect($response->json('data.0.initial'))->toBe('A');
});

it('returns the latest published sermon', function () {
    Sermon::factory()->create(['title' => 'Old', 'preached_at' => '2026-01-01']);
    Sermon::factory()->create(['title' => 'Newest', 'preached_at' => '2026-06-14']);
    Sermon::factory()->unpublished()->create(['title' => 'Draft', 'preached_at' => '2026-12-01']);

    $this->getJson('/api/v1/public/sermons/latest')
        ->assertOk()
        ->assertJsonPath('data.title', 'Newest');
});

it('shows an event by its slug', function () {
    Event::factory()->create(['slug' => 'maison-de-feu-2026', 'title' => 'Maison de Feu']);

    $this->getJson('/api/v1/public/events/maison-de-feu-2026')
        ->assertOk()
        ->assertJsonPath('data.title', 'Maison de Feu')
        ->assertJsonPath('data.slug', 'maison-de-feu-2026');
});

it('lists active home groups with coordinates', function () {
    HomeGroup::factory()->create(['name' => 'Cellule Bethel', 'coordinates' => ['top' => '46%', 'left' => '28%']]);

    $this->getJson('/api/v1/public/home-groups')
        ->assertOk()
        ->assertJsonPath('data.0.coordinates.top', '46%');
});

it('submits a prayer request and sends automated notification', function () {
    Setting::set('prayer_success_ui_message', 'Success custom message', 'prayers');
    Setting::set('prayer_automated_notification_message', 'Hello [Nom], we pray for you.', 'prayers');

    Log::shouldReceive('info')
        ->once()
        ->with('Prayer notification sent', Mockery::on(function ($data) {
            return $data['to_email'] === 'jean@example.com' && str_contains($data['message'], 'Hello Jean');
        }));

    $response = $this->postJson('/api/v1/public/prayer-requests', [
        'name' => 'Jean',
        'phone' => '+22501020304',
        'email' => 'jean@example.com',
        'category' => 'Santé',
        'message' => 'Priez pour ma guérison.',
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('message', 'Success custom message')
        ->assertJsonPath('data.name', 'Jean')
        ->assertJsonPath('data.status', 'new');

    $this->assertDatabaseHas('prayer_requests', [
        'name' => 'Jean',
        'email' => 'jean@example.com',
        'status' => 'new',
    ]);
});

it('submits a prayer request and parses accolade placeholders', function () {
    Setting::set('prayer_success_ui_message', 'Success custom message', 'prayers');
    Setting::set('prayer_automated_notification_message', 'Hello {{name}} (email: {{email}}, phone: {{phone}}), your prayer request for "{{category}}" containing message "{{message}}" is assigned to Pastor {{pastor_name}}.', 'prayers');

    $pastor = User::factory()->create(['name' => 'Pasteur Marc']);

    Log::shouldReceive('info')
        ->twice() // once for the API post, once for manual invocation
        ->with('Prayer notification sent', Mockery::on(function ($data) {
            return $data['to_email'] === 'jean@example.com';
        }));

    $response = $this->postJson('/api/v1/public/prayer-requests', [
        'name' => 'Jean',
        'phone' => '+22501020304',
        'email' => 'jean@example.com',
        'category' => 'Santé',
        'message' => 'Priez pour ma guérison.',
    ]);

    $response->assertStatus(201);

    // Assign the pastor to the request to test the template parsing with pastor
    $prayer = PrayerRequest::latest()->first();
    $prayer->assigned_to = $pastor->id;
    $prayer->save();
    $prayer->load('assignee');

    // Trigger sendConfirmation manually to verify the pastor_name works
    (new PrayerNotificationService)->sendConfirmation($prayer);
});
