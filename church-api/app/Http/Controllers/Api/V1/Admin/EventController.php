<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\EventRequest;
use App\Http\Resources\V1\EventResource;
use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;

class EventController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return EventResource::collection(Event::query()->chronological()->get());
    }

    public function store(EventRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['slug'] = $this->uniqueSlug($data['slug'] ?? null, $data['title']);

        $event = Event::create($data);

        return (new EventResource($event))->response()->setStatusCode(201);
    }

    public function show(Event $event): EventResource
    {
        return new EventResource($event);
    }

    public function update(EventRequest $request, Event $event): EventResource
    {
        $data = $request->validated();

        if (array_key_exists('slug', $data) || array_key_exists('title', $data)) {
            $data['slug'] = $this->uniqueSlug(
                $data['slug'] ?? $event->slug,
                $data['title'] ?? $event->title,
                $event->id,
            );
        }

        $event->update($data);

        return new EventResource($event);
    }

    public function destroy(Event $event): JsonResponse
    {
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
