<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\SermonResource;
use App\Models\Sermon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class SermonController extends Controller
{
    /**
     * Published sermons with optional filtering by series, speaker or book
     * (powers the médiathèque filters).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Sermon::query()
            ->with('scriptures')
            ->published();

        $query->searchOnRequest()
            ->filterOnRequest()
            ->sortOnRequest();

        if (! $request->has('sort')) {
            $query->latestFirst();
        }

        $sermons = $query->paginate($request->integer('per_page', 12));

        $speakers = Sermon::query()->published()->distinct()->pluck('speaker')->filter()->sort()->values()->all();
        $series = Sermon::query()->published()->distinct()->pluck('series')->filter()->sort()->values()->all();
        $years = Sermon::query()->published()->pluck('preached_at')->map(fn ($d) => $d->format('Y'))->unique()->sortDesc()->values()->all();
        $dates = Sermon::query()->published()->pluck('preached_at')->map(fn ($d) => $d->format('Y-m-d'))->unique()->sortDesc()->values()->all();
        $books = Sermon::query()->published()->distinct()->pluck('book')->filter()->sort()->values()->all();

        return SermonResource::collection($sermons)->additional([
            'meta' => [
                'speakers' => $speakers,
                'series' => $series,
                'years' => $years,
                'dates' => $dates,
                'books' => $books,
            ],
        ]);
    }

    /**
     * The single most recent published sermon — the "Dernier message" section.
     */
    public function latest(): SermonResource
    {
        $sermon = Sermon::query()->with('scriptures')->published()->latestFirst()->first();

        abort_if($sermon === null, 404, 'Aucun message disponible.');

        return new SermonResource($sermon);
    }

    public function show(Sermon $sermon): SermonResource
    {
        return new SermonResource($sermon->load('scriptures'));
    }

    /**
     * Stream an uploaded sermon media file with HTTP Range support so browsers
     * can play and seek it. Returns a BinaryFileResponse, which the kernel
     * prepares with 206 Partial Content / Accept-Ranges as needed.
     */
    public function stream(Sermon $sermon): BinaryFileResponse
    {
        abort_unless((bool) $sermon->media_type?->isFile() && $sermon->media_path !== null, 404);

        $relativePath = ltrim(Str::after($sermon->media_path, '/storage/'), '/');
        $absolutePath = Storage::disk('public')->path($relativePath);

        abort_unless(is_file($absolutePath), 404);

        return response()->file($absolutePath);
    }
}
