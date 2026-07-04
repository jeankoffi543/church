<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\FacebookRelayService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Drives a studio→Facebook broadcast from the Live Studio régie. The operator
 * pastes their Facebook stream key in the SaaS; our own SRS + ffmpeg relay push
 * the feed — no third-party dashboard, the key stays server-side.
 */
class StudioBroadcastController extends Controller
{
    public function __construct(private readonly FacebookRelayService $relay) {}

    /**
     * Issue a broadcast and return the WHIP url the studio publishes to. The
     * Facebook target comes from settings (`facebook_rtmps_url` /
     * `facebook_stream_key`); the key may also be supplied per-request.
     */
    public function startFacebook(Request $request): JsonResponse
    {
        $url = (string) (Setting::get('facebook_rtmps_url') ?: config('services.facebook.ingest_url'));
        $key = (string) ($request->input('stream_key') ?: Setting::get('facebook_stream_key'));

        abort_if($key === '', 422, 'Clé de stream Facebook manquante.');

        $broadcast = $this->relay->createBroadcast($url, $key);

        return response()->json([
            'data' => [
                'whip_url' => $broadcast['whipUrl'],
                'stream' => $broadcast['stream'],
            ],
        ]);
    }

    /**
     * Stop a running broadcast: kill the ffmpeg relay and forget the stream.
     */
    public function stopFacebook(Request $request): JsonResponse
    {
        $stream = (string) $request->input('stream', '');
        abort_if($stream === '', 422, 'Flux manquant.');

        $this->relay->stopRelay($stream);

        return response()->json(['data' => ['stopped' => true]]);
    }
}
