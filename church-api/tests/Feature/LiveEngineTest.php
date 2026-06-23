<?php

use App\Models\LiveChatMessage;
use App\Models\PastLive;
use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

/* ── Chat, reactions, audience ──────────────────────────────────── */

it('posts a chat message with a time offset from the live start', function () {
    Setting::set('live_started_at', now()->subSeconds(90)->toIso8601String(), 'live');

    $this->postJson('/api/v1/public/live/chat', ['author_name' => 'Koffi', 'message' => 'Gloire à Dieu !'])
        ->assertCreated()
        ->assertJsonPath('data.author_name', 'Koffi')
        ->assertJsonPath('data.message', 'Gloire à Dieu !');

    $message = LiveChatMessage::first();
    expect($message->time_offset_seconds)->toBeGreaterThanOrEqual(88);
});

it('validates chat input', function () {
    $this->postJson('/api/v1/public/live/chat', ['author_name' => '', 'message' => ''])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['author_name', 'message']);
});

it('returns the running chat for the initial load (no archived ones)', function () {
    LiveChatMessage::create(['author_name' => 'A', 'message' => 'live', 'time_offset_seconds' => 1]);
    $archived = PastLive::factory()->create();
    LiveChatMessage::create(['author_name' => 'B', 'message' => 'old', 'time_offset_seconds' => 1, 'past_live_id' => $archived->id]);

    $this->getJson('/api/v1/public/live/chat')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.message', 'live');
});

it('aggregates a reaction and reports the running total', function () {
    $this->postJson('/api/v1/public/live/react', ['type' => 'flame'])->assertOk()->assertJsonPath('data.total', 1);
    $this->postJson('/api/v1/public/live/react', ['type' => 'flame'])->assertOk()->assertJsonPath('data.total', 2);
    $this->postJson('/api/v1/public/live/react', ['type' => 'invalid'])->assertStatus(422);
});

it('counts the anonymous audience via heartbeats', function () {
    $this->postJson('/api/v1/public/live/presence', ['client_id' => 'aaa'])->assertOk()->assertJsonPath('data.count', 1);
    $this->postJson('/api/v1/public/live/presence', ['client_id' => 'bbb'])->assertOk()->assertJsonPath('data.count', 2);
    $this->postJson('/api/v1/public/live/presence', ['client_id' => 'aaa'])->assertOk()->assertJsonPath('data.count', 2);
    $this->postJson('/api/v1/public/live/leave', ['client_id' => 'bbb'])->assertOk()->assertJsonPath('data.count', 1);
});

/* ── Time-synced replay + archival ──────────────────────────────── */

it('serves archived chat ordered by time offset for replay', function () {
    $live = PastLive::factory()->create(['slug' => 'culte-archive']);
    LiveChatMessage::create(['author_name' => 'A', 'message' => 'plus tard', 'time_offset_seconds' => 120, 'past_live_id' => $live->id]);
    LiveChatMessage::create(['author_name' => 'B', 'message' => 'au début', 'time_offset_seconds' => 5, 'past_live_id' => $live->id]);

    $res = $this->getJson('/api/v1/public/past-lives/culte-archive/chat')->assertOk();
    expect(collect($res->json('data'))->pluck('time_offset_seconds')->all())->toBe([5, 120]);
});

it('archives the live (metadata + chat) into past_lives', function () {
    Setting::set('live_status', true, 'live');
    Setting::set('live_started_at', now()->subMinutes(45)->toIso8601String(), 'live');
    Setting::set('live_title', 'Culte de Pentecôte', 'live');
    Setting::set('live_embed_url', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'live');
    LiveChatMessage::create(['author_name' => 'A', 'message' => 'Amen', 'time_offset_seconds' => 10]);
    LiveChatMessage::create(['author_name' => 'B', 'message' => 'Alléluia', 'time_offset_seconds' => 20]);

    $this->artisan('mfm:archive-live')->assertSuccessful();

    $live = PastLive::query()->where('title', 'Culte de Pentecôte')->first();
    expect($live)->not->toBeNull();
    expect($live->youtube_id)->toBe('dQw4w9WgXcQ');
    expect($live->liveChatMessages()->count())->toBe(2);
    expect(LiveChatMessage::whereNull('past_live_id')->count())->toBe(0);
    expect((bool) Setting::get('live_status'))->toBeFalse();
    expect(Setting::get('live_started_at'))->toBe('');
});

it('exposes has_chat on archives that carry a chat replay', function () {
    $withChat = PastLive::factory()->create(['slug' => 'avec-chat']);
    LiveChatMessage::create(['author_name' => 'A', 'message' => 'x', 'time_offset_seconds' => 1, 'past_live_id' => $withChat->id]);
    PastLive::factory()->create(['slug' => 'sans-chat']);

    $this->getJson('/api/v1/public/past-lives/avec-chat')->assertOk()->assertJsonPath('data.has_chat', true);
    $this->getJson('/api/v1/public/past-lives/sans-chat')->assertOk()->assertJsonPath('data.has_chat', false);
});

/* ── Source type + view analytics ───────────────────────────────── */

it('archives lives as live_archive and admin uploads as upload', function () {
    Setting::set('live_status', true, 'live');
    Setting::set('live_started_at', now()->subMinutes(5)->toIso8601String(), 'live');
    Setting::set('live_title', 'Veillée', 'live');
    LiveChatMessage::create(['author_name' => 'A', 'message' => 'hi', 'time_offset_seconds' => 1]);
    Cache::put('live:reactions:flame', 7);
    Cache::put('live:reactions:heart', 3);

    $this->artisan('mfm:archive-live')->assertSuccessful();

    $archived = PastLive::query()->where('title', 'Veillée')->first();
    expect($archived->source_type->value)->toBe('live_archive');
    expect($archived->reaction_stats)->toBe(['heart' => 3, 'flame' => 7]);
    // Tallies are drained so the next live starts clean.
    expect(Cache::get('live:reactions:flame'))->toBeNull();

    actingAsSuperAdmin();
    $this->postJson('/api/v1/admin/past-lives', [
        'title' => 'Production Studio',
        'youtube_id' => 'abc123',
        'broadcasted_at' => '2026-06-01 18:00:00',
    ])->assertCreated()->assertJsonPath('data.source_type', 'upload');
});

it('counts a unique view once and ignores refreshes', function () {
    $live = PastLive::factory()->create(['views_count' => 0]);

    $this->postJson("/api/v1/public/past-lives/{$live->id}/view")->assertOk()->assertJsonPath('data.counted', true);
    $this->postJson("/api/v1/public/past-lives/{$live->id}/view")->assertOk()->assertJsonPath('data.counted', false);

    expect($live->fresh()->views_count)->toBe(1);
});

it('counts distinct visitors separately', function () {
    $live = PastLive::factory()->create(['views_count' => 0]);

    $this->withHeaders(['User-Agent' => 'Navigateur-A'])->postJson("/api/v1/public/past-lives/{$live->id}/view")->assertJsonPath('data.counted', true);
    $this->withHeaders(['User-Agent' => 'Navigateur-B'])->postJson("/api/v1/public/past-lives/{$live->id}/view")->assertJsonPath('data.counted', true);

    expect($live->fresh()->views_count)->toBe(2);
});

it('returns engagement analytics for an archive', function () {
    actingAsSuperAdmin();

    $live = PastLive::factory()->create(['views_count' => 42, 'reaction_stats' => ['flame' => 9, 'heart' => 4]]);
    // Two messages in the first 5-min bucket, one in the third.
    LiveChatMessage::create(['author_name' => 'A', 'message' => '1', 'time_offset_seconds' => 30, 'past_live_id' => $live->id]);
    LiveChatMessage::create(['author_name' => 'B', 'message' => '2', 'time_offset_seconds' => 120, 'past_live_id' => $live->id]);
    LiveChatMessage::create(['author_name' => 'C', 'message' => '3', 'time_offset_seconds' => 700, 'past_live_id' => $live->id]);

    $this->getJson("/api/v1/admin/past-lives/{$live->id}/analytics")
        ->assertOk()
        ->assertJsonPath('data.views_count', 42)
        ->assertJsonPath('data.messages_count', 3)
        ->assertJsonPath('data.reactions.flame', 9)
        ->assertJsonPath('data.chat_timeline.0', ['minute' => 0, 'count' => 2])
        ->assertJsonPath('data.chat_timeline.1', ['minute' => 10, 'count' => 1]);
});
