<?php

namespace App\Http\Resources\V1;

use App\Models\Resource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Named ResourceModelResource (not ResourceResource) to avoid confusion with
 * Laravel's own base `JsonResource` naming, since our model is itself called
 * `Resource`.
 *
 * @mixin Resource
 */
class ResourceModelResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'type' => $this->type,
            'description' => $this->description,
            'location' => $this->location,
            'condition' => $this->condition,
            'is_active' => $this->is_active,
            'bookings_count' => $this->whenCounted('bookings'),
        ];
    }
}
