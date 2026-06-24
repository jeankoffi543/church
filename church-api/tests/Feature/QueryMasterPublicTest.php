<?php

use App\Models\Album;
use App\Models\Branch;
use App\Models\Event;
use App\Models\HomeGroup;
use App\Models\PastLive;
use App\Models\Sermon;
use Illuminate\Support\Carbon;

/* ── Sermons Tests ────────────────────────────────────────────────── */

it('paginates public sermons correctly', function () {
    Sermon::factory()->count(15)->create(['is_published' => true]);

    // Check custom per_page
    $response = $this->getJson('/api/v1/public/sermons?per_page=5')
        ->assertOk()
        ->assertJsonCount(5, 'data');

    expect($response->json('meta.total'))->toBe(15);
    expect($response->json('meta.last_page'))->toBe(3);

    // Check changing page
    $this->getJson('/api/v1/public/sermons?per_page=5&page=2')
        ->assertOk()
        ->assertJsonCount(5, 'data')
        ->assertJsonPath('meta.current_page', 2);
});

it('filters public sermons by combined filters', function () {
    Sermon::factory()->create([
        'title' => 'Sermon A',
        'speaker' => 'Jean',
        'series' => 'Grace',
        'preached_at' => Carbon::parse('2026-01-01'),
        'is_published' => true,
    ]);
    Sermon::factory()->create([
        'title' => 'Sermon B',
        'speaker' => 'Jean',
        'series' => 'Fire',
        'preached_at' => Carbon::parse('2026-06-01'),
        'is_published' => true,
    ]);
    Sermon::factory()->create([
        'title' => 'Sermon C',
        'speaker' => 'Marc',
        'series' => 'Grace',
        'preached_at' => Carbon::parse('2025-01-01'),
        'is_published' => true,
    ]);

    // Multi-select speaker + series + year
    $response = $this->getJson('/api/v1/public/sermons?speaker[]=Jean&series[]=Grace&year[]=2026')
        ->assertOk()
        ->assertJsonCount(1, 'data');

    expect($response->json('data.0.title'))->toBe('Sermon A');
    expect($response->json('meta.total'))->toBe(1);
});

it('searches public sermons by partial keyword and spaces', function () {
    Sermon::factory()->create([
        'title' => 'The Power of Grace',
        'description' => 'graceful content',
        'speaker' => 'Orateur Grace',
        'series' => 'Série Grace',
        'is_published' => true,
    ]);
    Sermon::factory()->create([
        'title' => 'Holy Fire',
        'description' => 'empty description',
        'speaker' => 'Preacher B',
        'series' => 'Series B',
        'is_published' => true,
    ]);

    // Partial keyword and spaces handling
    $response = $this->getJson('/api/v1/public/sermons?search='.urlencode('  grace  '))
        ->assertOk()
        ->assertJsonCount(1, 'data');

    expect($response->json('data.0.title'))->toBe('The Power of Grace');

    // No results search
    $this->getJson('/api/v1/public/sermons?search=unavailablekeyword')
        ->assertOk()
        ->assertJsonCount(0, 'data')
        ->assertJsonPath('meta.total', 0);
});

it('sorts public sermons by various columns', function () {
    $s1 = Sermon::factory()->create(['title' => 'B Sermon', 'preached_at' => Carbon::parse('2026-01-01'), 'is_published' => true]);
    $s2 = Sermon::factory()->create(['title' => 'A Sermon', 'preached_at' => Carbon::parse('2026-02-01'), 'is_published' => true]);

    // Sort by preached_at descending (default)
    $response = $this->getJson('/api/v1/public/sermons')
        ->assertOk();
    expect($response->json('data.0.title'))->toBe('A Sermon');
    expect($response->json('data.1.title'))->toBe('B Sermon');

    // Sort by title ascending
    $responseAsc = $this->getJson('/api/v1/public/sermons?sort[title]=asc')
        ->assertOk();
    expect($responseAsc->json('data.0.title'))->toBe('A Sermon');
    expect($responseAsc->json('data.1.title'))->toBe('B Sermon');

    // Sort by title descending
    $responseDesc = $this->getJson('/api/v1/public/sermons?sort[title]=desc')
        ->assertOk();
    expect($responseDesc->json('data.0.title'))->toBe('B Sermon');
    expect($responseDesc->json('data.1.title'))->toBe('A Sermon');
});

/* ── Events Tests ─────────────────────────────────────────────────── */

it('paginates and searches public events', function () {
    Event::factory()->create(['title' => 'Bethel Conf', 'is_featured' => false]);
    Event::factory()->create(['title' => 'Shiloh 2026', 'is_featured' => false]);

    // Search and pagination
    $response = $this->getJson('/api/v1/public/events?search=Shiloh&per_page=1')
        ->assertOk()
        ->assertJsonCount(1, 'data');

    expect($response->json('data.0.title'))->toBe('Shiloh 2026');
});

/* ── Home Groups Tests ────────────────────────────────────────────── */

it('searches and filters home groups', function () {
    HomeGroup::factory()->create(['name' => 'Cell Bethel', 'zone_name' => 'Zone 1', 'meeting_day' => 'Lundi', 'is_active' => true]);
    HomeGroup::factory()->create(['name' => 'Cell Sion', 'zone_name' => 'Zone 2', 'meeting_day' => 'Mardi', 'is_active' => true]);

    // Filter by day and zone_name
    $response = $this->getJson('/api/v1/public/home-groups?day=Lundi&zone_name=Zone 1')
        ->assertOk()
        ->assertJsonCount(1, 'data');

    expect($response->json('data.0.name'))->toBe('Cell Bethel');
});

/* ── Branches Tests ───────────────────────────────────────────────── */

it('searches branches', function () {
    Branch::create([
        'title' => 'Campus Yopougon',
        'slug' => 'campus-yopougon',
        'address' => 'Yopougon, Abidjan',
        'phone' => '+22501020304',
        'hours' => 'Dimanche 8h-10h',
        'lat' => 5.3484,
        'lng' => -3.9789,
    ]);
    Branch::create([
        'title' => 'Campus Cocody',
        'slug' => 'campus-cocody',
        'address' => 'Cocody, Abidjan',
        'phone' => '+22501020304',
        'hours' => 'Dimanche 8h-10h',
        'lat' => 5.3484,
        'lng' => -3.9789,
    ]);

    $response = $this->getJson('/api/v1/public/branches?search=Cocody')
        ->assertOk()
        ->assertJsonCount(1, 'data');

    expect($response->json('data.0.title'))->toBe('Campus Cocody');
});

/* ── Past Lives Tests ─────────────────────────────────────────────── */

it('paginates and filters past lives', function () {
    PastLive::factory()->create(['title' => 'Live A', 'series_name' => 'Serie Grace', 'broadcasted_at' => Carbon::parse('2026-01-01')]);
    PastLive::factory()->create(['title' => 'Live B', 'series_name' => 'Serie Fire', 'broadcasted_at' => Carbon::parse('2025-01-01')]);

    $response = $this->getJson('/api/v1/public/past-lives?series[]=Serie Grace&year[]=2026')
        ->assertOk()
        ->assertJsonCount(1, 'data');

    expect($response->json('data.0.title'))->toBe('Live A');
});

/* ── Albums Tests ─────────────────────────────────────────────────── */

it('filters albums by year and category', function () {
    $e1 = Event::factory()->create(['type' => 'Youth']);
    $e2 = Event::factory()->create(['type' => 'Concert']);

    Album::factory()->create(['title' => 'Album 1', 'event_id' => $e1->id, 'created_at' => Carbon::parse('2026-01-01')]);
    Album::factory()->create(['title' => 'Album 2', 'event_id' => $e2->id, 'created_at' => Carbon::parse('2025-01-01')]);

    $response = $this->getJson('/api/v1/public/albums?category=Youth&year=2026')
        ->assertOk()
        ->assertJsonCount(1, 'data');

    expect($response->json('data.0.title'))->toBe('Album 1');
});
