<?php

use App\Models\Event;
use App\Models\HomeGroup;
use App\Models\Ministry;
use App\Models\Sermon;
use App\Models\Setting;

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
