<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\QueueName;
use App\Jobs\Middleware\LimitPerTenant;
use App\Models\PastLive;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;

/**
 * Heavy media job (CHR-161): once a live recording lands, extract a poster
 * thumbnail and read the real duration with ffmpeg/ffprobe. This is CPU-heavy, so
 * it runs on the dedicated `media` queue (its own Horizon supervisor) where it
 * can't block latency-sensitive work, and is funnelled per tenant. The tenant is
 * restored by stancl, so `public` storage resolves to THIS church's disk.
 */
class GenerateLiveThumbnail implements ShouldQueue
{
    use Queueable;

    public int $timeout = 600;

    public function __construct(public int $pastLiveId)
    {
        $this->onQueue(QueueName::Media->value);
    }

    public function handle(): void
    {
        $live = PastLive::find($this->pastLiveId);

        if ($live === null || $live->video_path === null) {
            return;
        }

        $disk = Storage::disk('public');
        // Stored as "/storage/lives/recordings/x.mp4" → path relative to the disk.
        $relative = ltrim(preg_replace('#^/?storage/#', '', $live->video_path) ?? '', '/');

        if ($relative === '' || ! $disk->exists($relative)) {
            return;
        }

        $video = $disk->path($relative);
        $thumbRelative = 'lives/thumbnails/'.pathinfo($relative, PATHINFO_FILENAME).'.jpg';
        $disk->makeDirectory('lives/thumbnails');

        // A poster frame at 5s (ffmpeg clamps to the last frame for shorter clips).
        Process::timeout(300)->run([
            'ffmpeg', '-y', '-ss', '5', '-i', $video, '-frames:v', '1', '-q:v', '3', $disk->path($thumbRelative),
        ]);

        $updates = [];

        if ($disk->exists($thumbRelative)) {
            $updates['thumbnail_path'] = '/storage/'.$thumbRelative;
        }

        if (($duration = $this->probeDuration($video)) !== null) {
            $updates['duration'] = $duration;
        }

        if ($updates !== []) {
            $live->update($updates);
        }
    }

    /**
     * @return array<int, object>
     */
    public function middleware(): array
    {
        return [new LimitPerTenant];
    }

    /** Read the recording's length via ffprobe and format it like "42 min". */
    private function probeDuration(string $video): ?string
    {
        $result = Process::timeout(60)->run([
            'ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', $video,
        ]);

        if (! $result->successful()) {
            return null;
        }

        $seconds = (int) round((float) trim($result->output()));

        return $seconds > 0 ? max(1, intdiv($seconds, 60)).' min' : null;
    }
}
