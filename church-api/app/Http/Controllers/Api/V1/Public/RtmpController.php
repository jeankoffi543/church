<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Enums\VideoSourceType;
use App\Http\Controllers\Controller;
use App\Jobs\GenerateLiveThumbnail;
use App\Models\PastLive;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Artisan;

class RtmpController extends Controller
{
    /**
     * Authorize an incoming RTMP publish (Nginx `on_publish` callback). OBS pushes
     * to rtmp://server/live/<key>; Nginx posts `name=<key>` here and only starts
     * the stream on a 2xx response. A wrong/absent key is rejected with 403, so a
     * third party cannot broadcast on our channel.
     */
    public function authorizePublish(Request $request): Response
    {
        $this->assertValidKey($request);

        return response('', 200);
    }

    /**
     * End-of-stream hook (Nginx `on_publish_done`): when OBS disconnects, archive
     * the running broadcast automatically (metadata + chat → past_lives) and flip
     * the live off — the same effect as the admin "Arrêter le direct" button. The
     * archive command is idempotent, so a concurrent manual stop is harmless.
     */
    public function publishDone(Request $request): Response
    {
        $this->assertValidKey($request);

        if ((bool) Setting::get('live_status')) {
            Artisan::call('mfm:archive-live');
        }

        return response('', 200);
    }

    /**
     * Recording-finished hook: Nginx converts the FLV to MP4 then posts here with
     * `file=<name>.mp4`. The recording lands in the API's public storage (shared
     * volume), so we attach it to the broadcast archived a moment earlier — making
     * the OBS/HLS replay fully playable, with its time-synced chat.
     */
    public function recorded(Request $request): Response
    {
        $this->assertValidKey($request);

        // Guard against path traversal — keep only the bare filename.
        $file = basename((string) $request->input('file', ''));
        abort_unless($file !== '' && str_ends_with($file, '.mp4'), 422, 'Fichier invalide.');

        $live = PastLive::query()
            ->where('source_type', VideoSourceType::LiveArchive)
            ->whereNull('video_path')
            ->latest('id')
            ->first();

        if ($live !== null) {
            $live->update([
                'video_path' => "/storage/lives/recordings/{$file}",
                'embed_url' => null,
            ]);

            // Poster thumbnail + real duration off the request path, on the media
            // queue (CHR-161).
            GenerateLiveThumbnail::dispatch($live->id);
        }

        return response('', 200);
    }

    /**
     * Reject the request (403) unless it carries the configured secret stream key.
     */
    private function assertValidKey(Request $request): void
    {
        $provided = (string) $request->input('name', '');
        // Admin-managed key (settings) takes precedence; env is the fallback default.
        $expected = (string) (Setting::get('live_stream_key') ?: config('services.rtmp.publish_key', ''));

        abort_if($expected === '' || ! hash_equals($expected, $provided), 403, 'Clé de stream invalide.');
    }
}
