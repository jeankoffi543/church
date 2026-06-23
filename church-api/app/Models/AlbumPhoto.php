<?php

namespace App\Models;

use Database\Factories\AlbumPhotoFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $album_id
 * @property string $image_path
 * @property int $order
 */
class AlbumPhoto extends Model
{
    /** @use HasFactory<AlbumPhotoFactory> */
    use HasFactory;

    protected $fillable = [
        'album_id',
        'image_path',
        'order',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'order' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Album, $this>
     */
    public function album(): BelongsTo
    {
        return $this->belongsTo(Album::class);
    }
}
