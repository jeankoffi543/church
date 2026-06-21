<?php

namespace App\Http\Resources\V1;

use App\Models\Sermon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Sermon
 */
class SermonResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'series' => $this->series,
            'title' => $this->title,
            'description' => $this->description,
            'speaker' => $this->speaker,
            'book' => $this->book,
            'date' => $this->preached_at?->toDateString(),
            'date_label' => $this->preached_at?->translatedFormat('d F Y'),
            'duration' => $this->duration,
            'video_url' => $this->video_url,
            'audio_url' => $this->audio_url,
            'is_published' => $this->is_published,
        ];
    }
}
