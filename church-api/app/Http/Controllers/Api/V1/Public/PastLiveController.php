<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\PastLiveResource;
use App\Models\PastLive;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
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
            ->with('preacher');

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
        $live = PastLive::query()->with('preacher')->latestFirst()->first();

        abort_if($live === null, 404, 'Aucune rediffusion disponible.');

        return new PastLiveResource($live);
    }

    /**
     * A single broadcast — increments the view counter on access.
     */
    public function show(PastLive $pastLive): PastLiveResource
    {
        $pastLive->increment('views_count');

        return new PastLiveResource($pastLive->load('preacher'));
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
