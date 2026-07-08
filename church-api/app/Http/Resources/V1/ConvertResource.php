<?php

namespace App\Http\Resources\V1;

use App\Models\Convert;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Convert
 */
class ConvertResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'phone' => $this->phone,
            'email' => $this->email,
            'decision_type' => $this->decision_type,
            'decision_date' => $this->decision_date?->format('Y-m-d'),
            'service_id' => $this->service_id,
            'evangelism_campaign_id' => $this->evangelism_campaign_id,
            'evangelism_campaign_title' => $this->whenLoaded('evangelismCampaign', fn () => $this->evangelismCampaign?->title),
            'assigned_counselor_id' => $this->assigned_counselor_id,
            'assigned_counselor_name' => $this->whenLoaded('assignedCounselor', fn () => $this->assignedCounselor?->name),
            'status' => $this->status,
            'notes' => $this->notes,
            'created_at' => $this->created_at,
        ];
    }
}
