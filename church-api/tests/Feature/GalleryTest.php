<?php

use App\Models\Album;
use App\Models\AlbumPhoto;
use App\Models\PastLive;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/* ── Public: albums ─────────────────────────────────────────────── */

it('lists albums with their photo counts', function () {
    $album = Album::factory()->create();
    AlbumPhoto::factory()->count(3)->create(['album_id' => $album->id]);

    $this->getJson('/api/v1/public/albums')
        ->assertOk()
        ->assertJsonStructure(['data' => [['id', 'title', 'slug', 'category', 'year', 'photos_count']]])
        ->assertJsonPath('data.0.photos_count', 3);
});

it('shows an album with its ordered photos by slug', function () {
    $album = Album::factory()->create(['slug' => 'mon-album']);
    AlbumPhoto::factory()->create(['album_id' => $album->id, 'order' => 1]);
    AlbumPhoto::factory()->create(['album_id' => $album->id, 'order' => 0]);

    $res = $this->getJson('/api/v1/public/albums/mon-album')->assertOk();
    $orders = collect($res->json('data.photos'))->pluck('order')->all();
    expect($orders)->toBe([0, 1]);
});

it('filters albums by year', function () {
    Album::factory()->create(['created_at' => '2024-01-01']);
    Album::factory()->create(['created_at' => '2026-01-01']);

    $this->getJson('/api/v1/public/albums?year=2026')
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

/* ── Public: past lives ─────────────────────────────────────────── */

it('returns the latest broadcast for the hero', function () {
    PastLive::factory()->create(['title' => 'Vieux', 'broadcasted_at' => '2026-01-01']);
    PastLive::factory()->create(['title' => 'Récent', 'broadcasted_at' => '2026-06-01']);

    $this->getJson('/api/v1/public/past-lives/latest')
        ->assertOk()
        ->assertJsonPath('data.title', 'Récent')
        ->assertJsonPath('data.media_type', 'video_url');
});

it('does not inflate the view counter merely by showing a broadcast', function () {
    // Views are now counted only via the dedicated, refresh-proof endpoint.
    $live = PastLive::factory()->create(['slug' => 'culte', 'views_count' => 5]);

    $this->getJson('/api/v1/public/past-lives/culte')->assertOk();

    expect($live->fresh()->views_count)->toBe(5);
});

it('streams an uploaded broadcast file with range support', function () {
    Storage::fake('public');
    Storage::disk('public')->put('lives/videos/clip.mp4', str_repeat('x', 4096));

    $live = PastLive::factory()->create([
        'youtube_id' => null,
        'video_path' => '/storage/lives/videos/clip.mp4',
    ]);

    $response = $this->get("/api/v1/public/past-lives/{$live->id}/stream", ['Range' => 'bytes=0-1023']);
    $response->assertStatus(206);
    expect($response->headers->get('Accept-Ranges'))->toBe('bytes');
});

/* ── Admin: gallery (gated by manage_gallery) ───────────────────── */

it('blocks album creation without the manage_gallery permission', function () {
    actingAsAdminWith([]);

    $this->postJson('/api/v1/admin/albums', ['title' => 'X'])->assertForbidden();
});

it('creates an album and bulk-uploads photos', function () {
    Storage::fake('public');
    actingAsSuperAdmin();

    $album = $this->postJson('/api/v1/admin/albums', ['title' => 'Conférence 2026'])
        ->assertCreated()
        ->assertJsonPath('data.slug', 'conference-2026')
        ->json('data.id');

    $this->post("/api/v1/admin/albums/{$album}/photos", [
        'photos' => [
            UploadedFile::fake()->image('a.jpg'),
            UploadedFile::fake()->image('b.jpg'),
        ],
    ])->assertOk()->assertJsonCount(2, 'data');

    expect(AlbumPhoto::where('album_id', $album)->count())->toBe(2);
    Storage::disk('public')->assertExists(
        str_replace('/storage/', '', AlbumPhoto::where('album_id', $album)->first()->image_path)
    );
});

it('rejects a bulk upload of more than 50 photos', function () {
    Storage::fake('public');
    actingAsSuperAdmin();
    $album = Album::factory()->create();

    $photos = array_map(fn () => UploadedFile::fake()->image('p.jpg'), range(1, 51));

    $this->post("/api/v1/admin/albums/{$album->id}/photos", ['photos' => $photos])
        ->assertStatus(422)
        ->assertJsonValidationErrors('photos');
});

it('creates a past live broadcast', function () {
    actingAsSuperAdmin();

    $this->postJson('/api/v1/admin/past-lives', [
        'title' => 'Culte de Moisson',
        'youtube_id' => 'abc123',
        'broadcasted_at' => '2026-06-01 18:00:00',
    ])
        ->assertCreated()
        ->assertJsonPath('data.slug', 'culte-de-moisson')
        ->assertJsonPath('data.media_type', 'video_url');
});
