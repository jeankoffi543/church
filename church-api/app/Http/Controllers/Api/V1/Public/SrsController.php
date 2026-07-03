<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Services\FacebookRelayService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * SRS media-server hooks — same pattern as the Nginx-RTMP hooks
 * ({@see RtmpController}), but for the studio's WHIP (WebRTC) publish. SRS calls
 * `on_publish` before accepting a stream and `on_unpublish` when it ends; SRS
 * expects HTTP 200 with body `0` to allow, a non-2xx to reject.
 */
class SrsController extends Controller
{
    public function __construct(private readonly FacebookRelayService $relay) {}

    /**
     * Authorize the publish (per-broadcast token issued by the studio) and start
     * the ffmpeg relay to Facebook. An unknown/forged stream is rejected (403),
     * so nobody can inject a broadcast onto our server.
     */
    public function onPublish(Request $request): Response
    {
        $stream = (string) $request->input('stream', '');
        $token = $this->tokenFromParam((string) $request->input('param', ''));

        abort_unless($this->relay->authorize($stream, $token), 403, 'Publication non autorisée.');

        $this->relay->startRelay($stream);

        return response('0', 200);
    }

    /**
     * End-of-stream hook: stop the relay and forget the broadcast.
     */
    public function onUnpublish(Request $request): Response
    {
        $this->relay->stopRelay((string) $request->input('stream', ''));

        return response('0', 200);
    }

    /**
     * Extract the publish token from SRS's `param` (the publish url query string,
     * e.g. `?app=live&stream=fb-xxx&token=yyy`).
     */
    private function tokenFromParam(string $param): string
    {
        parse_str(ltrim($param, '?'), $query);

        return (string) ($query['token'] ?? '');
    }
}
