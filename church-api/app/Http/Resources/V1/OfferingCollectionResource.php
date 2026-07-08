<?php

namespace App\Http\Resources\V1;

use App\Models\OfferingCollection;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin OfferingCollection
 */
class OfferingCollectionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'service_id' => $this->service_id,
            'nature' => $this->nature,
            'amount' => $this->amount,
            'currency' => $this->currency,
            'counted_by_id' => $this->counted_by_id,
            'counted_by' => $this->whenLoaded('countedBy', fn () => $this->countedBy?->name),
            'notes' => $this->notes,
        ];
    }
}
