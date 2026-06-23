<?php

namespace App\Console\Commands;

use App\Enums\VideoSourceType;
use App\Models\LiveChatMessage;
use App\Models\PastLive;
use App\Models\Setting;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

#[Signature('mfm:archive-live')]
#[Description('Archive the running broadcast (metadata + chat) into the past_lives archive so the chat stays consultable on replay.')]
class ArchiveLive extends Command
{
    public function handle(): int
    {
        $startedAt = Setting::get('live_started_at');
        $hasChat = LiveChatMessage::query()->whereNull('past_live_id')->exists();

        if (! $hasChat && (! is_string($startedAt) || $startedAt === '')) {
            Setting::set('live_status', false, 'live');
            Setting::set('live_started_at', '', 'live');
            $this->info('Aucun direct à archiver.');

            return self::SUCCESS;
        }

        $title = (string) (Setting::get('live_title') ?: 'Rediffusion du direct');
        $broadcastedAt = is_string($startedAt) && $startedAt !== '' ? Carbon::parse($startedAt) : now();

        $pastLive = PastLive::create([
            'title' => $title,
            'slug' => $this->uniqueSlug($title),
            'description' => (Setting::get('live_description') ?: null),
            'youtube_id' => $this->extractYouTubeId((string) Setting::get('live_embed_url')),
            'video_path' => null,
            'thumbnail_path' => null,
            'series_name' => 'Cultes en direct',
            'source_type' => VideoSourceType::LiveArchive,
            'preacher_id' => null,
            'views_count' => 0,
            'reaction_stats' => $this->snapshotReactions(),
            'duration' => max(1, (int) $broadcastedAt->diffInMinutes(now())).' min',
            'broadcasted_at' => $broadcastedAt,
        ]);

        $moved = LiveChatMessage::query()->whereNull('past_live_id')->update(['past_live_id' => $pastLive->id]);

        Setting::set('live_status', false, 'live');
        Setting::set('live_started_at', '', 'live');

        $this->info("Direct archivé : {$pastLive->slug} ({$moved} message(s) de chat).");

        return self::SUCCESS;
    }

    /**
     * Drain the live reaction tallies from the cache into a persisted snapshot,
     * so the archive's "Impressions" dashboard can chart what was sent.
     *
     * @return array<string, int>|null
     */
    private function snapshotReactions(): ?array
    {
        $stats = [];

        foreach (['heart', 'flame', 'hands', 'dove', 'crown'] as $type) {
            $count = (int) Cache::get("live:reactions:{$type}", 0);
            if ($count > 0) {
                $stats[$type] = $count;
                Cache::forget("live:reactions:{$type}");
            }
        }

        return $stats === [] ? null : $stats;
    }

    private function extractYouTubeId(string $url): ?string
    {
        return preg_match('~(?:youtu\.be/|v=|embed/|shorts/)([\w-]{11})~', $url, $m) === 1 ? $m[1] : null;
    }

    private function uniqueSlug(string $title): string
    {
        $base = Str::slug($title) ?: 'direct';
        $slug = $base.'-'.now()->format('Ymd-His');
        $suffix = 2;

        while (PastLive::query()->where('slug', $slug)->exists()) {
            $slug = "{$base}-".now()->format('Ymd-His')."-{$suffix}";
            $suffix++;
        }

        return $slug;
    }
}
