<?php

use App\Models\Sermon;
use App\Models\SermonScripture;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

it('creates a sermon with an external video URL and scriptures', function () {
    actingAsSuperAdmin();

    $this->postJson('/api/v1/admin/sermons', [
        'title' => 'La grâce qui transforme',
        'speaker' => 'Pasteur David',
        'preached_at' => '2026-06-14',
        'media_type' => 'video_url',
        'media_url' => 'https://www.youtube.com/watch?v=abc',
        'scriptures' => ['Romains 5:1', 'Romains 5:8'],
    ])
        ->assertCreated()
        ->assertJsonPath('data.media_type', 'video_url')
        ->assertJsonPath('data.is_audio', false)
        ->assertJsonPath('data.scriptures', ['Romains 5:1', 'Romains 5:8']);

    expect(Sermon::first()->scriptures)->toHaveCount(2);
});

it('requires a URL for url media types', function () {
    actingAsSuperAdmin();

    $this->postJson('/api/v1/admin/sermons', [
        'title' => 'Sans URL',
        'speaker' => 'X',
        'preached_at' => '2026-06-14',
        'media_type' => 'audio_url',
    ])->assertStatus(422)->assertJsonValidationErrors('media_url');
});

it('requires an upload for file media types and stores the path', function () {
    Storage::fake('public');
    actingAsSuperAdmin();

    // Missing file → validation error.
    $this->postJson('/api/v1/admin/sermons', [
        'title' => 'Sans fichier',
        'speaker' => 'X',
        'preached_at' => '2026-06-14',
        'media_type' => 'audio_file',
    ])->assertStatus(422)->assertJsonValidationErrors('media');

    // With file → stored.
    $response = $this->post('/api/v1/admin/sermons', [
        'title' => 'Avec fichier audio',
        'speaker' => 'X',
        'preached_at' => '2026-06-14',
        'media_type' => 'audio_file',
        'media' => UploadedFile::fake()->create('message.mp3', 200, 'audio/mpeg'),
    ])->assertCreated()->assertJsonPath('data.is_audio', true);

    $path = $response->json('data.media_path');
    expect($path)->toStartWith('/storage/sermons/');
    Storage::disk('public')->assertExists(str_replace('/storage/', '', $path));
});

it('creates a notes-only sermon with no media', function () {
    actingAsSuperAdmin();

    $this->postJson('/api/v1/admin/sermons', [
        'title' => 'Notes du culte',
        'speaker' => 'X',
        'preached_at' => '2026-06-14',
        'media_type' => '', // notes only
        'scriptures' => ['Jean 1:1'],
    ])
        ->assertCreated()
        ->assertJsonPath('data.media_type', null)
        ->assertJsonPath('data.media_url', null)
        ->assertJsonPath('data.media_path', null);
});

it('clears stored media when a sermon is switched to notes only', function () {
    Storage::fake('public');
    Storage::disk('public')->put('sermons/videos/v.mp4', 'x');
    actingAsSuperAdmin();

    $sermon = Sermon::factory()->create([
        'media_type' => 'video_file',
        'media_path' => '/storage/sermons/videos/v.mp4',
        'media_url' => null,
    ]);

    $this->post("/api/v1/admin/sermons/{$sermon->id}", [
        '_method' => 'PUT',
        'media_type' => '', // → notes only
    ])
        ->assertOk()
        ->assertJsonPath('data.media_type', null)
        ->assertJsonPath('data.media_path', null);

    Storage::disk('public')->assertMissing('sermons/videos/v.mp4');
    expect($sermon->fresh()->media_path)->toBeNull();
});

it('de-duplicates scriptures and replaces them on update', function () {
    actingAsSuperAdmin();
    $sermon = Sermon::factory()->create();

    $this->post("/api/v1/admin/sermons/{$sermon->id}", [
        '_method' => 'PUT',
        'media_type' => 'video_url',
        'media_url' => 'https://youtube.com/watch?v=x',
        'scriptures' => ['Jean 3:16', 'Jean 3:16', 'Romains 8:28'],
    ])
        ->assertOk()
        ->assertJsonPath('data.scriptures', ['Jean 3:16', 'Romains 8:28']);

    expect($sermon->fresh()->scriptures)->toHaveCount(2);
});

it('exposes media + scriptures on the public listing', function () {
    $sermon = Sermon::factory()->create();
    $sermon->scriptures()->create(['reference' => 'Psaumes 23:1']);

    $this->getJson('/api/v1/public/sermons')
        ->assertOk()
        ->assertJsonStructure(['data' => [['id', 'media_type', 'is_audio', 'media_url', 'scriptures']]])
        ->assertJsonPath('data.0.scriptures', ['Psaumes 23:1']);
});

it('exposes the range-capable stream route as the file media url', function () {
    Storage::fake('public');
    Storage::disk('public')->put('sermons/audios/x.mp3', 'fake-audio');

    $sermon = Sermon::factory()->create([
        'media_type' => 'audio_file',
        'media_path' => '/storage/sermons/audios/x.mp3',
        'media_url' => null,
    ]);

    $url = $this->getJson("/api/v1/public/sermons/{$sermon->id}")
        ->assertOk()
        ->json('data.media_url');

    // Stream route + a cache-busting fingerprint tied to the stored file.
    expect($url)->toStartWith("/api/v1/public/sermons/{$sermon->id}/stream?v=");
});

it('changes the media url fingerprint when the file changes', function () {
    Storage::fake('public');
    Storage::disk('public')->put('sermons/videos/old.mp4', 'old');

    $sermon = Sermon::factory()->create([
        'media_type' => 'video_file',
        'media_path' => '/storage/sermons/videos/old.mp4',
        'media_url' => null,
    ]);
    $before = $this->getJson("/api/v1/public/sermons/{$sermon->id}")->json('data.media_url');

    // Replacing the underlying file must yield a different URL (cache bust).
    $sermon->update(['media_path' => '/storage/sermons/videos/new.mp4']);
    $after = $this->getJson("/api/v1/public/sermons/{$sermon->id}")->json('data.media_url');

    expect($after)->not->toBe($before);
});

it('streams uploaded media with HTTP range support', function () {
    Storage::fake('public');
    Storage::disk('public')->put('sermons/videos/clip.mp4', str_repeat('x', 4096));

    $sermon = Sermon::factory()->create([
        'media_type' => 'video_file',
        'media_path' => '/storage/sermons/videos/clip.mp4',
        'media_url' => null,
    ]);

    // Full request streams the file.
    $this->get("/api/v1/public/sermons/{$sermon->id}/stream")->assertOk();

    // A Range request yields 206 Partial Content with the requested slice.
    $response = $this->get("/api/v1/public/sermons/{$sermon->id}/stream", ['Range' => 'bytes=0-1023']);
    $response->assertStatus(206);
    expect($response->headers->get('Accept-Ranges'))->toBe('bytes');
    expect($response->headers->get('Content-Length'))->toBe('1024');
});

it('returns 404 when streaming non-file or missing media', function () {
    $external = Sermon::factory()->create([
        'media_type' => 'video_url',
        'media_url' => 'https://youtube.com/watch?v=x',
        'media_path' => null,
    ]);
    $this->get("/api/v1/public/sermons/{$external->id}/stream")->assertNotFound();

    Storage::fake('public');
    $missing = Sermon::factory()->create([
        'media_type' => 'video_file',
        'media_path' => '/storage/sermons/videos/gone.mp4',
        'media_url' => null,
    ]);
    $this->get("/api/v1/public/sermons/{$missing->id}/stream")->assertNotFound();
});

it('cascades scripture deletion when a sermon is removed', function () {
    actingAsSuperAdmin();
    $sermon = Sermon::factory()->create();
    $sermon->scriptures()->create(['reference' => 'Actes 2:1']);

    $this->deleteJson("/api/v1/admin/sermons/{$sermon->id}")->assertNoContent();

    expect(SermonScripture::count())->toBe(0);
});
