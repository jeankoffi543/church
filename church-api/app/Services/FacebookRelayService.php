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
 * Runtime state (token + relay pid) lives in the cache, keyed by the random
 * stream name, so the `on_publish` webhook (a separate request) can resolve it.
 *
 * The only OS-touching steps — spawning and killing ffmpeg — are isolated in
 * {@see spawnFfmpeg()} and {@see killPid()}; swap those to change the relay
 * mechanism (e.g. `docker exec` into the SRS container, or a dedicated agent).
 *
 * @phpstan-type BroadcastState array{token: string, target: string, pid: int|null}
 */
class FacebookRelayService
{
    private const TTL_HOURS = 6;

    /**
     * Issue a one-shot broadcast: a random stream name + publish token, and the
     * WHIP url the studio publishes to. `$rtmpsUrl` + `$streamKey` form the
     * Facebook ingest target the relay will push to.
     *
     * @return array{stream: string, whipUrl: string}
     */
    public function createBroadcast(string $rtmpsUrl, string $streamKey): array
    {
        $stream = 'fb-'.Str::lower(Str::random(24));
        $token = Str::random(48);
        $target = rtrim($rtmpsUrl, '/').'/'.ltrim($streamKey, '/');

        $this->put($stream, ['token' => $token, 'target' => $target, 'pid' => null]);

        $base = rtrim((string) config('services.srs.whip_base'), '?');
        $app = (string) config('services.srs.app', 'live');
        $whipUrl = $base.'?app='.$app.'&stream='.$stream.'&token='.$token;

        return ['stream' => $stream, 'whipUrl' => $whipUrl];
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
     * Start the ffmpeg relay (SRS internal RTMP → Facebook RTMPS) for a stream
     * that has just been authorized. Idempotent: a relay already running is left
     * untouched.
     */
    public function startRelay(string $stream): void
    {
        $state = $this->state($stream);
        if ($state === null || $state['pid'] !== null) {
            return;
        }

        $input = rtrim((string) config('services.srs.rtmp_internal'), '/').'/'.$stream;
        $pid = $this->spawnFfmpeg($input, $state['target'], $stream);

        $state['pid'] = $pid;
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

        if ($state['pid'] !== null) {
            $this->killPid($state['pid']);
        }

        Cache::forget($this->key($stream));
    }

    /**
     * Spawn a detached ffmpeg relay to Facebook. Video and audio are **re-encoded**
     * with Facebook-safe settings: a fixed 2 s GOP (`-g 60 -keyint_min 60
     * -sc_threshold 0` at 30 fps) so keyframes are regular, `yuv420p`/High profile,
     * and stereo AAC. A passthrough (`-c:v copy`) was rejected — the WebRTC
     * encoder's irregular keyframe interval and late-appearing audio made Facebook
     * drop the connection. `nohup` keeps it alive; the returned pid is ffmpeg's.
     */
    protected function spawnFfmpeg(string $input, string $target, string $stream): ?int
    {
        $log = storage_path('logs/relay-'.$stream.'.log');

        $command = sprintf(
            'nohup ffmpeg -hide_banner -loglevel warning -i %s '.
            '-c:v libx264 -preset veryfast -profile:v high -pix_fmt yuv420p -r 30 '.
            '-g 60 -keyint_min 60 -sc_threshold 0 -b:v 4000k -maxrate 4000k -bufsize 8000k '.
            '-c:a aac -ar 44100 -b:a 128k -ac 2 '.
            '-f flv %s >> %s 2>&1 & echo $!',
            escapeshellarg($input),
            escapeshellarg($target),
            escapeshellarg($log),
        );

        $pid = (int) trim(Process::run($command)->output());

        return $pid > 0 ? $pid : null;
    }

    /**
     * Terminate a relay process (SIGTERM lets ffmpeg flush and close cleanly).
     */
    protected function killPid(int $pid): void
    {
        Process::run('kill '.$pid);
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
