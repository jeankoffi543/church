<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\EventResource;
use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class EventController extends Controller
{
    /**
     * Chronological events. `?scope=upcoming` filters to future ones,
     * `?featured=1` returns only the highlighted event(s).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $events = Event::query()
            ->when($request->string('scope')->toString() === 'upcoming', fn ($q) => $q->upcoming())
            ->when($request->boolean('featured'), fn ($q) => $q->where('is_featured', true))
            ->chronological()
            ->get();

        return EventResource::collection($events);
    }

    /**
     * Resolved by slug (see Event::getRouteKeyName()).
     */
    public function show(Event $event): EventResource
    {
        return new EventResource($event);
    }
}
