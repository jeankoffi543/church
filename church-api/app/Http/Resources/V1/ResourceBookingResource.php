<?php

namespace App\Http\Resources\V1;

use App\Models\ResourceBooking;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ResourceBooking
 */
class ResourceBookingResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'resource_id' => $this->resource_id,
            // `$this->resource` collides with JsonResource's OWN `$resource`
            // property (the wrapped model) — go through getRelation()
            // explicitly to reach the model's actual "resource" relation.
            'resource_name' => $this->whenLoaded('resource', fn () => $this->resource->getRelation('resource')?->name),
            'title' => $this->title,
            'starts_at' => $this->starts_at?->format('Y-m-d\TH:i'),
            'ends_at' => $this->ends_at?->format('Y-m-d\TH:i'),
            'booked_by' => $this->booked_by,
            'booked_by_name' => $this->whenLoaded('bookedBy', fn () => $this->bookedBy?->name),
            'notes' => $this->notes,
            'status' => $this->status,
        ];
    }
}
