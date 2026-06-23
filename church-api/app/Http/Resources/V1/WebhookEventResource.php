<?php

namespace App\Http\Resources\V1;

use App\Models\WebhookEvent;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin WebhookEvent
 */
class WebhookEventResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'provider' => $this->provider,
            'event' => $this->event,
            'reference' => $this->reference,
            'signature_valid' => $this->signature_valid,
            'status' => $this->status,
            'error' => $this->error,
            'payload' => $this->payload,
            'processed_at' => $this->processed_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'date_label' => $this->created_at?->locale('fr')->translatedFormat('d M Y · H:i:s'),
        ];
    }
}
