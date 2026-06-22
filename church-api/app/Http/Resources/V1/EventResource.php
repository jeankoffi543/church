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
            'starts_at' => $this->start_date?->toIso8601String(),
            'ends_at' => $this->end_date?->toIso8601String(),
            // Convenience fields the front-end card/detail already consume.
            'day' => $this->start_date?->format('d'),
            'month' => $this->start_date ? mb_strtoupper($this->start_date->translatedFormat('M')) : null,
            'time' => $this->start_date?->format('H\hi'),
            'full_date' => $this->start_date?->translatedFormat('l d F Y'),
            'image' => $this->image_path,
            'highlights' => $this->highlights ?? [],
            'is_featured' => $this->is_featured,
        ];
    }
}
