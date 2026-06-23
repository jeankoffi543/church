<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\PastLiveRequest;
use App\Http\Resources\V1\PastLiveResource;
use App\Models\PastLive;
use App\Traits\HandlesFileUploads;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;

class PastLiveController extends Controller
{
    use HandlesFileUploads;

    public function index(): AnonymousResourceCollection
    {
        return PastLiveResource::collection(
            PastLive::query()->with('preacher')->latestFirst()->paginate(20)
        );
    }

    public function store(PastLiveRequest $request): JsonResponse
    {
        $live = PastLive::create($this->payload($request));

        return (new PastLiveResource($live->load('preacher')))->response()->setStatusCode(201);
    }

    public function show(PastLive $pastLive): PastLiveResource
    {
        return new PastLiveResource($pastLive->load('preacher'));
    }

    public function update(PastLiveRequest $request, PastLive $pastLive): PastLiveResource
    {
        $pastLive->update($this->payload($request, $pastLive));

        return new PastLiveResource($pastLive->load('preacher'));
    }

    public function destroy(PastLive $pastLive): JsonResponse
    {
        $this->deleteStoredFile($pastLive->video_path);
        $this->deleteStoredFile($pastLive->thumbnail_path);
        $pastLive->delete();

        return response()->json(status: 204);
    }

    /**
     * Build the persisted attributes, resolving uploads and the slug.
     *
     * @return array<string, mixed>
     */
    private function payload(PastLiveRequest $request, ?PastLive $live = null): array
    {
        $data = collect($request->validated())
            ->only(['title', 'description', 'youtube_id', 'series_name', 'preacher_id', 'duration', 'broadcasted_at'])
            ->all();

        if ($request->has('title')) {
            $data['slug'] = $this->uniqueSlug($request->validated('title'), $live?->id);
        }

        if ($request->hasFile('thumbnail')) {
            $this->deleteStoredFile($live?->thumbnail_path);
            $data['thumbnail_path'] = $this->uploadSingleFile($request->file('thumbnail'), 'lives/thumbnails');
        }

        if ($request->hasFile('video')) {
            $this->deleteStoredFile($live?->video_path);
            $data['video_path'] = $this->uploadSingleFile($request->file('video'), 'lives/videos');
            // A freshly uploaded file supersedes any external YouTube id.
            $data['youtube_id'] = null;
        }

        return $data;
    }

    private function uniqueSlug(string $title, ?int $ignoreId = null): string
    {
        $base = Str::slug($title) ?: 'rediffusion';
        $slug = $base;
        $suffix = 2;

        while (PastLive::query()->where('slug', $slug)->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }
}
