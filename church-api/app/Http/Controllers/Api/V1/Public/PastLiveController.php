<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\PastLiveResource;
use App\Jobs\IncrementVideoView;
use App\Models\PastLive;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class PastLiveController extends Controller
{
    /**
     * Past broadcasts (newest first), optionally scoped to a series. Powers the
     * VOD carousels grouped by series / month on the front-end.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = PastLive::query()
            ->with('preacher')
            ->withCount('liveChatMessages');

        $query->searchOnRequest()
            ->filterOnRequest()
            ->sortOnRequest();

        if (! $request->has('sort')) {
            $query->latestFirst();
        }

        $lives = $query->paginate($request->integer('per_page', 50));

        $years = PastLive::query()->pluck('broadcasted_at')->map(fn ($d) => $d->format('Y'))->unique()->sortDesc()->values()->all();
        $series = PastLive::query()->distinct()->pluck('series_name')->filter()->sort()->values()->all();

        return PastLiveResource::collection($lives)->additional([
            'meta' => [
                'years' => $years,
                'series' => $series,
            ],
        ]);
    }

    /**
     * The most recent broadcast — the cinematic hero on /lives-archives.
     */
    public function latest(): PastLiveResource
    {
        $live = PastLive::query()->with('preacher')->withCount('liveChatMessages')->latestFirst()->first();

        abort_if($live === null, 404, 'Aucune rediffusion disponible.');

        return new PastLiveResource($live);
    }

    /**
     * A single broadcast. View counting is handled separately by `recordView`
     * so a page refresh (F5) cannot inflate the figure.
     */
    public function show(PastLive $pastLive): PastLiveResource
    {
        return new PastLiveResource($pastLive->load('preacher')->loadCount('liveChatMessages'));
    }

    /**
     * Register a unique view. Anonymous and refresh-proof: a fingerprint built
     * from the client IP + User-Agent is held in the cache for 12h, and the
     * counter is only incremented (off the request path, via a queued job) the
     * first time that fingerprint is seen for this broadcast.
     */
    public function recordView(Request $request, PastLive $pastLive): JsonResponse
    {
        $fingerprint = hash('sha256', $request->ip().'|'.$request->userAgent());
        $key = "view:past_live:{$pastLive->id}:client:{$fingerprint}";

        $counted = Cache::add($key, true, now()->addHours(12));

        if ($counted) {
            IncrementVideoView::dispatch($pastLive->id);
        }

        return response()->json(['data' => ['counted' => $counted]]);
    }

    /**
     * Range-capable stream for an uploaded broadcast file (HTTP 206), so the
     * player can seek reliably across dev and production.
     */
    public function stream(PastLive $pastLive): BinaryFileResponse
    {
        abort_unless($pastLive->video_path !== null, 404);

        $relativePath = ltrim(Str::after($pastLive->video_path, '/storage/'), '/');
        $absolutePath = Storage::disk('public')->path($relativePath);

        abort_unless(is_file($absolutePath), 404);

        return response()->file($absolutePath);
    }
}
