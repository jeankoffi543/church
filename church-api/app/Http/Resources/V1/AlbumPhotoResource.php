<?php

namespace App\Http\Resources\V1;

use App\Models\AlbumPhoto;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AlbumPhoto
 */
class AlbumPhotoResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'album_id' => $this->album_id,
            // Raw stored path (`/storage/...`) or absolute URL; the front-end's
            // assetUrl() resolves it to a fully-qualified URL.
            'image_path' => $this->image_path,
            'order' => $this->order,
        ];
    }
}
