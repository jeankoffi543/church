<?php

namespace App\Http\Resources\V1;

use App\Models\FollowUp;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin FollowUp
 */
class FollowUpResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'followable_type' => $this->followable_type,
            'followable_id' => $this->followable_id,
            'followable_name' => $this->whenLoaded('followable', fn () => $this->followable?->name),
            'assigned_to' => $this->assigned_to,
            'counselor_name' => $this->whenLoaded('counselor', fn () => $this->counselor?->name),
            'status' => $this->status,
            'next_action_date' => $this->next_action_date?->format('Y-m-d'),
            'notes' => FollowUpNoteResource::collection($this->whenLoaded('notes')),
            'created_at' => $this->created_at,
        ];
    }
}
