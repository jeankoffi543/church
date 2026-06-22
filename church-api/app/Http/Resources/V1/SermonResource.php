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
            'books_category' => $this->books_category ?? [],
            'date' => $this->preached_at?->toDateString(),
            'date_label' => $this->preached_at?->translatedFormat('d F Y'),
            'duration' => $this->duration,
            'media_type' => $this->media_type?->value,
            'is_audio' => (bool) $this->media_type?->isAudio(),
            'is_file' => (bool) $this->media_type?->isFile(),
            // Playable source: external URL, or a Range-capable stream route for
            // uploaded files (so browsers can play/seek them reliably). The `?v`
            // fingerprint changes whenever the underlying file changes, busting
            // the browser cache for that otherwise-stable per-sermon URL.
            'media_url' => $this->media_type?->isFile()
                ? route('api.v1.public.sermons.stream', $this->id, absolute: false).'?v='.substr(md5((string) $this->media_path), 0, 8)
                : $this->media_url,
            'media_path' => $this->media_path,
            'background_image' => $this->background_image,
            'scriptures' => $this->whenLoaded(
                'scriptures',
                fn () => $this->scriptures->pluck('reference')->all(),
                []
            ),
            // Legacy fields kept for backward compatibility.
            'video_url' => $this->video_url,
            'audio_url' => $this->audio_url,
            'is_published' => $this->is_published,
        ];
    }
}
