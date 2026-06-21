<?php

namespace App\Http\Resources\V1;

use App\Models\MinistryApplication;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin MinistryApplication
 */
class MinistryApplicationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'motivation' => $this->motivation,
            'status' => $this->status->value,
            'decision_note' => $this->decision_note,
            'decision_note_public' => (bool) $this->decision_note_public,
            'ministry_id' => $this->ministry_id,
            'ministry' => $this->whenLoaded('ministry', fn () => [
                'id' => $this->ministry->id,
                'name' => $this->ministry->name,
                'chef_id' => $this->ministry->chef_id,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
