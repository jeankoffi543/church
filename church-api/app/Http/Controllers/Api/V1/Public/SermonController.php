<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\SermonResource;
use App\Models\Sermon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SermonController extends Controller
{
    /**
     * Published sermons with optional filtering by series, speaker or book
     * (powers the médiathèque filters).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $sermons = Sermon::query()
            ->published()
            ->when($request->filled('series'), fn ($q) => $q->where('series', $request->string('series')))
            ->when($request->filled('speaker'), fn ($q) => $q->where('speaker', $request->string('speaker')))
            ->when($request->filled('book'), fn ($q) => $q->where('book', $request->string('book')))
            ->latestFirst()
            ->paginate($request->integer('per_page', 12));

        return SermonResource::collection($sermons);
    }

    /**
     * The single most recent published sermon — the "Dernier message" section.
     */
    public function latest(): SermonResource
    {
        $sermon = Sermon::query()->published()->latestFirst()->first();

        abort_if($sermon === null, 404, 'Aucun message disponible.');

        return new SermonResource($sermon);
    }

    public function show(Sermon $sermon): SermonResource
    {
        return new SermonResource($sermon);
    }
}
