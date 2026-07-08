<?php

namespace App\Http\Resources\V1;

use App\Models\ServiceAssignment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ServiceAssignment
 */
class ServiceAssignmentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'service_id' => $this->service_id,
            'member_id' => $this->member_id,
            'member_name' => $this->whenLoaded('member', fn () => $this->member?->name),
            'team_id' => $this->team_id,
            'team_name' => $this->whenLoaded('team', fn () => $this->team?->name),
            'role' => $this->role,
            'status' => $this->status,
            'notes' => $this->notes,
        ];
    }
}
