<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Str;

/**
 * Orchestrates a studio→Facebook broadcast on our own infrastructure.
 *
 * The studio publishes its program feed to SRS over WHIP (WebRTC); SRS exposes it
 * as an internal RTMP stream. This service issues the per-broadcast credentials,
 * authorizes SRS's `on_publish` hook, and drives an ffmpeg relay that pushes the
 * internal RTMP to Facebook over RTMPS with the client's stream key — the key
 * never leaves the backend.
 *
 * The PUBLIC site does NOT get an HLS re-encode (that pipeline was hopelessly
 * fragile against the jittery browser source — a stalled tab duplicated thousands
 * of frames and killed ffmpeg). Instead the site plays the SAME WebRTC stream back
 * over **WHEP** ({@see createBroadcast()} returns its url): WebRTC natively absorbs
 * a frozen/jittery source (jitter buffer, last-frame hold, resume) so playback
 * never dies. No transcode, no segmentation, no relay for the site.
 *
 * Runtime state (token + relay pid) lives in the cache, keyed by the random stream
 * name, so the `on_publish` webhook (a separate request) can resolve it.
 *
 * The only OS-touching steps — spawning and killing ffmpeg — are isolated in
 * {@see spawnFacebookRelay()} and {@see killStream()}; swap those to change the
 * relay mechanism (e.g. `docker exec` into the SRS container).
 *
 * @phpstan-type BroadcastState array{token: string, target: string, pid: int|null}
 */
class FacebookRelayService
{
    private const TTL_HOURS = 6;

    /**
     * Issue a one-shot broadcast: a random stream name + publish token, the WHIP
     * url the studio publishes to, and the WHEP url the public site plays back.
     * `$rtmpsUrl` + `$streamKey` form the Facebook ingest target the relay pushes to.
     *
     * @return array{stream: string, whipUrl: string, whepUrl: string}
     */
    public function createBroadcast(string $rtmpsUrl, string $streamKey): array
    {
        $stream = 'fb-'.Str::lower(Str::random(24));
        $token = Str::random(48);
        $target = rtrim($rtmpsUrl, '/').'/'.ltrim($streamKey, '/');

        $this->put($stream, ['token' => $token, 'target' => $target, 'pid' => null]);

        $app = (string) config('services.srs.app', 'live');

        $whipBase = rtrim((string) config('services.srs.whip_base'), '?');
        $whipUrl = $whipBase.'?app='.$app.'&stream='.$stream.'&token='.$token;

        // The public site plays the same WebRTC publish back over WHEP — no re-encode.
        $whepBase = rtrim((string) config('services.srs.whep_base'), '?');
        $whepUrl = $whepBase.'?app='.$app.'&stream='.$stream;

        return ['stream' => $stream, 'whipUrl' => $whipUrl, 'whepUrl' => $whepUrl];
    }

    /**
     * Whether an SRS publish for `$stream` carries the token we issued.
     */
    public function authorize(string $stream, string $token): bool
    {
        $state = $this->state($stream);

        return $state !== null && $token !== '' && hash_equals($state['token'], $token);
    }

    /**
     * Start the ffmpeg relay (SRS internal RTMP → Facebook RTMPS) for a stream that
     * has just been authorized. Idempotent: a relay already running is left untouched.
     */
    public function startRelay(string $stream): void
    {
        $state = $this->state($stream);
        if ($state === null || $state['pid'] !== null) {
            return;
        }

        $input = rtrim((string) config('services.srs.rtmp_internal'), '/').'/'.$stream;
        $state['pid'] = $this->spawnFacebookRelay($input, $state['target'], $stream);
        $this->put($stream, $state);
    }

    /**
     * Stop the relay and forget the broadcast (SRS `on_unpublish` or an explicit
     * stop from the studio).
     */
    public function stopRelay(string $stream): void
    {
        $state = $this->state($stream);
        if ($state === null) {
            return;
        }

        $this->killStream($stream);
        Cache::forget($this->key($stream));
    }

    /**
     * Spawn the detached Facebook relay. Re-encoded with Facebook-safe settings: a
     * fixed 2 s GOP (`-g 60 -keyint_min 60 -sc_threshold 0` at 30 fps), `yuv420p`/
     * High profile, stereo AAC. A passthrough (`-c:v copy`) was rejected — the
     * WebRTC encoder's irregular keyframes + late audio made Facebook drop.
     */
    protected function spawnFacebookRelay(string $input, string $target, string $stream): ?int
    {
        $command = sprintf(
            'nohup ffmpeg -hide_banner -loglevel warning -i %s '.
            '-c:v libx264 -preset fast -profile:v high -pix_fmt yuv420p -r 30 '.
            '-g 60 -keyint_min 60 -sc_threshold 0 -b:v 8000k -maxrate 8000k -bufsize 16000k '.
            '-c:a aac -ar 44100 -b:a 128k -ac 2 '.
            '-f flv %s >> %s 2>&1 & echo $!',
            escapeshellarg($input),
            escapeshellarg($target),
            escapeshellarg(storage_path('logs/relay-'.$stream.'.log')),
        );

        $pid = (int) trim(Process::run($command)->output());

        return $pid > 0 ? $pid : null;
    }

    /**
     * Kill the relay ffmpeg by the (unique, random) stream name on its command line
     * — robust against a leaked/renamed pid.
     */
    protected function killStream(string $stream): void
    {
        Process::run('pkill -f '.escapeshellarg($stream));
    }

    /**
     * @return BroadcastState|null
     */
    private function state(string $stream): ?array
    {
        /** @var BroadcastState|null $state */
        $state = Cache::get($this->key($stream));

        return $state;
    }

    /**
     * @param  BroadcastState  $state
     */
    private function put(string $stream, array $state): void
    {
        Cache::put($this->key($stream), $state, now()->addHours(self::TTL_HOURS));
    }

    private function key(string $stream): string
    {
        return 'srs_broadcast:'.$stream;
    }
}
