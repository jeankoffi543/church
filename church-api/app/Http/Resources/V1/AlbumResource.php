<?php

namespace App\Http\Resources\V1;

use App\Models\Album;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Album
 */
class AlbumResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'description' => $this->description,
            'cover_image' => $this->cover_image,
            'event_id' => $this->event_id,
            // Category used by the public filter — the linked event's type, or
            // "Autre" when the album is standalone.
            'category' => $this->event?->type ?? 'Autre',
            'event_title' => $this->event?->title,
            'year' => $this->created_at?->format('Y'),
            'date_label' => $this->created_at?->translatedFormat('d F Y'),
            'created_at' => $this->created_at?->toDateString(),
            'photos_count' => $this->whenCounted('photos', default: $this->photos()->count()),
            'photos' => AlbumPhotoResource::collection($this->whenLoaded('photos')),
        ];
    }
}
