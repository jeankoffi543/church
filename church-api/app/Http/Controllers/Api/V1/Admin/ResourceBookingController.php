<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\ResourceBookingRequest;
use App\Http\Resources\V1\ResourceBookingResource;
use App\Models\ResourceBooking;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class ResourceBookingController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = ResourceBooking::query()->with(['resource', 'bookedBy'])->orderBy('starts_at');

        $query->searchOnRequest()->filterOnRequest()->sortOnRequest();

        return ResourceBookingResource::collection(
            $query->paginate($request->integer('per_page', 20))
        );
    }

    public function store(ResourceBookingRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $this->assertNoOverlap($validated['resource_id'], $validated['starts_at'], $validated['ends_at']);

        $booking = ResourceBooking::create([...$validated, 'booked_by' => $request->user()?->id]);
        $booking->refresh();

        return (new ResourceBookingResource($booking->load(['resource', 'bookedBy'])))
            ->response()->setStatusCode(201);
    }

    public function update(ResourceBookingRequest $request, ResourceBooking $resourceBooking): ResourceBookingResource
    {
        $validated = $request->validated();

        $resourceId = $validated['resource_id'] ?? $resourceBooking->resource_id;
        $startsAt = $validated['starts_at'] ?? $resourceBooking->starts_at;
        $endsAt = $validated['ends_at'] ?? $resourceBooking->ends_at;

        if (($validated['status'] ?? $resourceBooking->status) !== 'annule') {
            $this->assertNoOverlap($resourceId, $startsAt, $endsAt, ignoreId: $resourceBooking->id);
        }

        $resourceBooking->update($validated);

        return new ResourceBookingResource($resourceBooking->load(['resource', 'bookedBy']));
    }

    public function destroy(ResourceBooking $resourceBooking): JsonResponse
    {
        $resourceBooking->delete();

        return response()->json(status: 204);
    }

    /**
     * Reject a booking whose [starts_at, ends_at] overlaps another
     * non-cancelled booking on the same resource. Classic interval overlap:
     * existing.starts_at < new.ends_at AND existing.ends_at > new.starts_at.
     */
    private function assertNoOverlap(int $resourceId, Carbon|string $startsAt, Carbon|string $endsAt, ?int $ignoreId = null): void
    {
        $overlaps = ResourceBooking::query()
            ->where('resource_id', $resourceId)
            ->active()
            ->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))
            ->where('starts_at', '<', Carbon::parse($endsAt)->toDateTimeString())
            ->where('ends_at', '>', Carbon::parse($startsAt)->toDateTimeString())
            ->exists();

        if ($overlaps) {
            throw ValidationException::withMessages([
                'starts_at' => ['Cette ressource est déjà réservée sur ce créneau.'],
            ]);
        }
    }
}
