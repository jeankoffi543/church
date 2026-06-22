<?php

namespace App\Models;

use App\Enums\SermonMediaType;
use Database\Factories\SermonFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string|null $series
 * @property string $title
 * @property string|null $description
 * @property string $speaker
 * @property string|null $book
 * @property Carbon $preached_at
 * @property string|null $duration
 * @property SermonMediaType $media_type
 * @property string|null $media_path
 * @property string|null $media_url
 * @property string|null $background_image
 * @property string|null $video_url
 * @property string|null $audio_url
 * @property bool $is_published
 */
class Sermon extends Model
{
    /** @use HasFactory<SermonFactory> */
    use HasFactory;

    protected $fillable = [
        'series',
        'title',
        'description',
        'speaker',
        'book',
        'preached_at',
        'duration',
        'media_type',
        'media_path',
        'media_url',
        'background_image',
        'video_url',
        'audio_url',
        'is_published',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'preached_at' => 'date',
            'is_published' => 'boolean',
            'media_type' => SermonMediaType::class,
        ];
    }

    /**
     * Bible references attached to this sermon.
     *
     * @return HasMany<SermonScripture, $this>
     */
    public function scriptures(): HasMany
    {
        return $this->hasMany(SermonScripture::class);
    }

    /**
     * @param  Builder<Sermon>  $query
     */
    public function scopePublished(Builder $query): void
    {
        $query->where('is_published', true);
    }

    /**
     * Most recent first.
     *
     * @param  Builder<Sermon>  $query
     */
    public function scopeLatestFirst(Builder $query): void
    {
        $query->orderByDesc('preached_at')->orderByDesc('id');
    }
}
