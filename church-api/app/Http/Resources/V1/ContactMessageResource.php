<?php

namespace App\Http\Resources\V1;

use App\Models\ContactMessage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ContactMessage
 */
class ContactMessageResource extends JsonResource
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
            'subject' => $this->subject,
            'message' => $this->message,
            'status' => $this->status->value,
            'replied_at' => $this->replied_at?->toIso8601String(),
            'replied_by' => $this->replied_by,
            'replied_by_user' => $this->whenLoaded('repliedBy', fn () => [
                'id' => $this->repliedBy->id,
                'name' => $this->repliedBy->name,
                'email' => $this->repliedBy->email,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
