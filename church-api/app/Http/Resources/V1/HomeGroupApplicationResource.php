<?php

namespace App\Http\Resources\V1;

use App\Models\HomeGroupApplication;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin HomeGroupApplication
 */
class HomeGroupApplicationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'home_group_id' => $this->home_group_id,
            'motivation' => $this->motivation,
            'status' => $this->status,
            'processed_by' => $this->processed_by,
            'decision_note' => $this->decision_note,
            'decision_note_public' => (bool) $this->decision_note_public,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'home_group' => new HomeGroupResource($this->whenLoaded('homeGroup')),
            'user' => new UserResource($this->whenLoaded('user')),
            'processor' => new UserResource($this->whenLoaded('processor')),
        ];
    }
}
