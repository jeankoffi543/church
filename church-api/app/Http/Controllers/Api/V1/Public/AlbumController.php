<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\AlbumResource;
use App\Models\Album;
use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AlbumController extends Controller
{
    /**
     * Portfolio albums (newest first), optionally filtered by year or by the
     * linked event category.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Album::query()
            ->with('event')
            ->withCount('photos');

        $query->searchOnRequest()
            ->filterOnRequest()
            ->sortOnRequest();

        if (! $request->has('sort')) {
            $query->latestFirst();
        }

        $albums = $query->paginate($request->integer('per_page', 24));

        $years = Album::query()->pluck('created_at')->map(fn ($d) => $d->format('Y'))->unique()->sortDesc()->values()->all();
        $categories = Event::query()->distinct()->pluck('type')->filter()->sort()->values()->all();

        return AlbumResource::collection($albums)->additional([
            'meta' => [
                'years' => $years,
                'categories' => $categories,
            ],
        ]);
    }

    /**
     * A single album with its ordered photos (lightbox source).
     */
    public function show(Album $album): AlbumResource
    {
        return new AlbumResource($album->load(['event', 'photos'])->loadCount('photos'));
    }
}
