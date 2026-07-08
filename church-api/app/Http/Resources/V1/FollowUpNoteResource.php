<?php

namespace App\Http\Resources\V1;

use App\Models\FollowUpNote;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin FollowUpNote
 */
class FollowUpNoteResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'action_type' => $this->action_type,
            'note' => $this->note,
            'author_name' => $this->whenLoaded('author', fn () => $this->author?->name),
            'created_at' => $this->created_at,
        ];
    }
}
