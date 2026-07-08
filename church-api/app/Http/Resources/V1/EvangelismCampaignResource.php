<?php

namespace App\Http\Resources\V1;

use App\Models\EvangelismCampaign;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin EvangelismCampaign
 */
class EvangelismCampaignResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'date' => $this->date?->format('Y-m-d'),
            'location' => $this->location,
            'notes' => $this->notes,
            'converts_count' => $this->whenCounted('converts'),
        ];
    }
}
