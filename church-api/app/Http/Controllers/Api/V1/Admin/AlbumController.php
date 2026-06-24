<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\AlbumRequest;
use App\Http\Resources\V1\AlbumResource;
use App\Models\Album;
use App\Traits\HandlesFileUploads;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;

class AlbumController extends Controller
{
    use HandlesFileUploads;

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Album::query()->with('event')->withCount('photos');

        $query->searchOnRequest()
            ->filterOnRequest()
            ->sortOnRequest();

        if (! $request->has('sort')) {
            $query->latestFirst();
        }

        return AlbumResource::collection(
            $query->paginate($request->integer('per_page', 20))
        );
    }

    public function store(AlbumRequest $request): JsonResponse
    {
        $data = collect($request->validated())->only(['title', 'description', 'event_id'])->all();
        $data['slug'] = $this->uniqueSlug($request->validated('title'));

        if ($request->hasFile('cover_image')) {
            $data['cover_image'] = $this->uploadSingleFile($request->file('cover_image'), 'gallery/covers');
        }

        $album = Album::create($data);

        return (new AlbumResource($album->loadCount('photos')))->response()->setStatusCode(201);
    }

    public function show(Album $album): AlbumResource
    {
        return new AlbumResource($album->load(['event', 'photos'])->loadCount('photos'));
    }

    public function update(AlbumRequest $request, Album $album): AlbumResource
    {
        $album->fill(collect($request->validated())->only(['title', 'description', 'event_id'])->all());

        if ($request->has('title')) {
            $album->slug = $this->uniqueSlug($request->validated('title'), $album->id);
        }

        if ($request->hasFile('cover_image')) {
            $this->deleteStoredFile($album->cover_image);
            $album->cover_image = $this->uploadSingleFile($request->file('cover_image'), 'gallery/covers');
        } elseif ($request->boolean('remove_cover_image')) {
            $this->deleteStoredFile($album->cover_image);
            $album->cover_image = null;
        }

        $album->save();

        return new AlbumResource($album->load(['event', 'photos'])->loadCount('photos'));
    }

    public function destroy(Album $album): JsonResponse
    {
        // Remove every stored file before the cascade drops the photo rows.
        $this->deleteStoredFile($album->cover_image);
        $album->photos->each(fn ($photo) => $this->deleteStoredFile($photo->image_path));
        $album->delete();

        return response()->json(status: 204);
    }

    /**
     * Build a URL-safe, unique slug from the album title.
     */
    private function uniqueSlug(string $title, ?int $ignoreId = null): string
    {
        $base = Str::slug($title) ?: 'album';
        $slug = $base;
        $suffix = 2;

        while (Album::query()->where('slug', $slug)->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }
}
