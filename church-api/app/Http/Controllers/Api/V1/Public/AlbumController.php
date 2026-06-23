<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\AlbumResource;
use App\Models\Album;
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
        $albums = Album::query()
            ->with('event')
            ->withCount('photos')
            ->when($request->filled('year'), fn ($q) => $q->whereYear('created_at', $request->integer('year')))
            ->when($request->filled('category'), fn ($q) => $q->whereHas('event', fn ($e) => $e->where('type', $request->string('category'))))
            ->latestFirst()
            ->paginate($request->integer('per_page', 24));

        return AlbumResource::collection($albums);
    }

    /**
     * A single album with its ordered photos (lightbox source).
     */
    public function show(Album $album): AlbumResource
    {
        return new AlbumResource($album->load(['event', 'photos'])->loadCount('photos'));
    }
}
