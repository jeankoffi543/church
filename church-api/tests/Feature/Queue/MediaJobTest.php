<?php

use App\Jobs\GenerateLiveThumbnail;
use App\Jobs\Middleware\LimitPerTenant;
use App\Models\PastLive;
use App\Models\Setting;
use Illuminate\Support\Facades\Queue;

// CHR-161: heavy media/video work runs on the dedicated `media` queue (funnelled
// per tenant) and is kicked off when a live recording lands.

it('routes the thumbnail job to the media queue and funnels it per tenant', function () {
    $job = new GenerateLiveThumbnail(1);

    expect($job->queue)->toBe('media')
        ->and($job->middleware())->toHaveCount(1)
        ->and($job->middleware()[0])->toBeInstanceOf(LimitPerTenant::class);
});

it('no-ops safely when the recording file is missing', function () {
    $missingPath = PastLive::factory()->create(['video_path' => '/storage/lives/recordings/nope.mp4', 'thumbnail_path' => null]);
    (new GenerateLiveThumbnail($missingPath->id))->handle();
    expect($missingPath->fresh()->thumbnail_path)->toBeNull();

    $noPath = PastLive::factory()->create(['video_path' => null, 'thumbnail_path' => null]);
    (new GenerateLiveThumbnail($noPath->id))->handle();
    expect($noPath->fresh()->thumbnail_path)->toBeNull();

    // A vanished PastLive must not blow up the worker.
    (new GenerateLiveThumbnail(999999))->handle();
    expect(PastLive::find(999999))->toBeNull();
});

it('dispatches the media job when a recording lands', function () {
    Queue::fake();
    Setting::set('live_stream_key', 'secret-key', 'live');
    $live = PastLive::factory()->create(['source_type' => 'live_archive', 'video_path' => null]);

    $this->postJson('/api/v1/public/rtmp/recorded', ['name' => 'secret-key', 'file' => 'culte.mp4'])
        ->assertOk();

    expect($live->fresh()->video_path)->toBe('/storage/lives/recordings/culte.mp4');
    Queue::assertPushed(GenerateLiveThumbnail::class, fn ($job) => $job->pastLiveId === $live->id);
});
