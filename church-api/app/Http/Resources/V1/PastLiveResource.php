<?php

namespace App\Http\Resources\V1;

use App\Models\PastLive;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin PastLive
 */
class PastLiveResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $isFile = $this->youtube_id === null && $this->video_path !== null;
        $isEmbed = $this->youtube_id === null && $this->video_path === null && $this->embed_url !== null;

        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'description' => $this->description,
            'youtube_id' => $this->youtube_id,
            'thumbnail_path' => $this->thumbnail_path,
            'series_name' => $this->series_name,
            'source_type' => $this->source_type?->value,
            'preacher_id' => $this->preacher_id,
            'preacher' => $this->preacher?->name,
            // True when a time-synced chat replay is available for this archive.
            'has_chat' => (int) ($this->live_chat_messages_count ?? 0) > 0,
            'views_count' => $this->views_count,
            'duration' => $this->duration,
            'broadcasted_at' => $this->broadcasted_at?->toIso8601String(),
            'date_label' => $this->broadcasted_at?->locale('fr')->translatedFormat('d F Y'),
            'month_label' => $this->broadcasted_at?->locale('fr')->translatedFormat('F Y'),
            // Player contract, mirroring the sermon media shape: external URL for
            // YouTube / generic embeds, a Range-capable stream route for files.
            'media_type' => $this->youtube_id !== null || $isEmbed ? 'video_url' : ($isFile ? 'video_file' : null),
            'media_src' => $this->youtube_id !== null
                ? "https://www.youtube.com/watch?v={$this->youtube_id}"
                : ($isFile
                    ? route('api.v1.public.past-lives.stream', $this->id, absolute: false).'?v='.substr(md5((string) $this->video_path), 0, 8)
                    : ($isEmbed ? $this->embed_url : null)),
        ];
    }
}
