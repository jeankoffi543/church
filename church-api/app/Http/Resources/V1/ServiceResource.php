<?php

namespace App\Http\Resources\V1;

use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Service
 */
class ServiceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'type' => $this->type,
            'date' => $this->date?->format('Y-m-d'),
            'start_time' => $this->start_time,
            'notes' => $this->notes,
            'offering_collections' => OfferingCollectionResource::collection($this->whenLoaded('offeringCollections')),
            'attendances' => AttendanceResource::collection($this->whenLoaded('attendances')),
            'assignments' => ServiceAssignmentResource::collection($this->whenLoaded('assignments')),
            'created_at' => $this->created_at,
        ];
    }
}
