<?php

namespace App\Http\Resources\V1;

use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Event
 */
class EventResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'title' => $this->title,
            'type' => $this->type,
            'description' => $this->description,
            'location' => $this->location,
            'host' => $this->host,
            'starts_at' => $this->starts_at?->toIso8601String(),
            'ends_at' => $this->ends_at?->toIso8601String(),
            // Convenience fields the front-end card/detail already consume.
            'day' => $this->starts_at?->format('d'),
            'month' => $this->starts_at ? mb_strtoupper($this->starts_at->translatedFormat('M')) : null,
            'time' => $this->starts_at?->format('H\hi'),
            'full_date' => $this->starts_at?->translatedFormat('l d F Y'),
            'image' => $this->image,
            'highlights' => $this->highlights ?? [],
            'is_featured' => $this->is_featured,
        ];
    }
}
