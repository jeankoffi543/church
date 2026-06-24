<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\EventRequest;
use App\Http\Resources\V1\EventResource;
use App\Models\Event;
use App\Traits\HandlesFileUploads;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;

class EventController extends Controller
{
    use HandlesFileUploads;

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Event::query();

        $query->searchOnRequest()
            ->filterOnRequest()
            ->sortOnRequest();

        if (! $request->has('sort')) {
            $query->chronological();
        }

        return EventResource::collection(
            $query->paginate($request->integer('per_page', 20))
        );
    }

    public function checkSlug(Request $request): JsonResponse
    {
        $slug = $request->query('slug');
        $ignoreId = $request->query('ignore_id');

        $exists = Event::query()
            ->where('slug', $slug)
            ->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))
            ->exists();

        return response()->json(['exists' => $exists]);
    }

    public function store(EventRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['slug'] = $this->uniqueSlug($data['slug'] ?? null, $data['title']);
        unset($data['image'], $data['remove_image']);

        if ($request->hasFile('image')) {
            $data['image_path'] = $this->uploadSingleFile($request->file('image'), 'events');
        }

        $event = Event::create($data);

        return (new EventResource($event))->response()->setStatusCode(201);
    }

    public function show(string $id): EventResource
    {
        $event = is_numeric($id)
            ? Event::findOrFail((int) $id)
            : Event::where('slug', $id)->firstOrFail();

        return new EventResource($event);
    }

    public function update(EventRequest $request, string $id): EventResource
    {
        $event = is_numeric($id)
            ? Event::findOrFail((int) $id)
            : Event::where('slug', $id)->firstOrFail();

        $data = $request->validated();
        $removeImage = (bool) ($data['remove_image'] ?? false);
        unset($data['image'], $data['remove_image']);

        if (array_key_exists('slug', $data) || array_key_exists('title', $data)) {
            $data['slug'] = $this->uniqueSlug(
                $data['slug'] ?? $event->slug,
                $data['title'] ?? $event->title,
                $event->id,
            );
        }

        if ($request->hasFile('image')) {
            $this->deleteStoredFile($event->image_path);
            $data['image_path'] = $this->uploadSingleFile($request->file('image'), 'events');
        } elseif ($removeImage) {
            $this->deleteStoredFile($event->image_path);
            $data['image_path'] = null;
        }

        $event->update($data);

        return new EventResource($event);
    }

    public function destroy(string $id): JsonResponse
    {
        $event = is_numeric($id)
            ? Event::findOrFail((int) $id)
            : Event::where('slug', $id)->firstOrFail();

        $this->deleteStoredFile($event->image_path);
        $event->delete();

        return response()->json(status: 204);
    }

    /**
     * Build a unique slug, falling back to the title, ignoring the current row.
     */
    private function uniqueSlug(?string $slug, string $title, ?int $ignoreId = null): string
    {
        $base = Str::slug($slug ?: $title);
        $candidate = $base;
        $suffix = 2;

        while (Event::query()
            ->where('slug', $candidate)
            ->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))
            ->exists()
        ) {
            $candidate = "{$base}-{$suffix}";
            $suffix++;
        }

        return $candidate;
    }
}
