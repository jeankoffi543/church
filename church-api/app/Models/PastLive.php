<?php

namespace App\Models;

use Database\Factories\PastLiveFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $title
 * @property string $slug
 * @property string|null $description
 * @property string|null $youtube_id
 * @property string|null $video_path
 * @property string|null $thumbnail_path
 * @property string|null $series_name
 * @property int|null $preacher_id
 * @property int $views_count
 * @property string|null $duration
 * @property Carbon $broadcasted_at
 */
class PastLive extends Model
{
    /** @use HasFactory<PastLiveFactory> */
    use HasFactory;

    protected $fillable = [
        'title',
        'slug',
        'description',
        'youtube_id',
        'video_path',
        'thumbnail_path',
        'series_name',
        'preacher_id',
        'views_count',
        'duration',
        'broadcasted_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'broadcasted_at' => 'datetime',
            'views_count' => 'integer',
        ];
    }

    /**
     * The user who preached / hosted this broadcast.
     *
     * @return BelongsTo<User, $this>
     */
    public function preacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'preacher_id');
    }

    /**
     * Chat messages captured during the live, replayed in sync on the archive.
     *
     * @return HasMany<LiveChatMessage, $this>
     */
    public function liveChatMessages(): HasMany
    {
        return $this->hasMany(LiveChatMessage::class);
    }

    /**
     * Most recently broadcast first.
     *
     * @param  Builder<PastLive>  $query
     */
    public function scopeLatestFirst(Builder $query): void
    {
        $query->orderByDesc('broadcasted_at')->orderByDesc('id');
    }
}
