<?php

namespace App\Models;

use App\Enums\VideoSourceType;
use App\Support\QueryFilters;
use Database\Factories\PastLiveFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Keky\QueryMaster\Concerns\HasFilters;
use Keky\QueryMaster\Concerns\IsSearchable;
use Keky\QueryMaster\Concerns\IsSortable;
use Keky\QueryMaster\Enums\SearchOperator;
use Keky\QueryMaster\Filter;

/**
 * @property int $id
 * @property string $title
 * @property string $slug
 * @property string|null $description
 * @property string|null $youtube_id
 * @property string|null $video_path
 * @property string|null $embed_url
 * @property string|null $thumbnail_path
 * @property string|null $series_name
 * @property VideoSourceType $source_type
 * @property int|null $preacher_id
 * @property int $views_count
 * @property array<string, int>|null $reaction_stats
 * @property string|null $duration
 * @property Carbon $broadcasted_at
 */
class PastLive extends Model
{
    /** @use HasFactory<PastLiveFactory> */
    use HasFactory, HasFilters, IsSearchable, IsSortable;

    protected array $searchable = [
        'title' => SearchOperator::LIKE,
        'description' => SearchOperator::LIKE,
        'series_name' => SearchOperator::LIKE,
        'youtube_id' => SearchOperator::LIKE,
    ];

    protected array $sortable = [
        'title',
        'series_name',
        'media_type',
        'broadcasted_at',
        'views_count',
        'created_at',
    ];

    public function filters(): array
    {
        return [
            ...QueryFilters::exact('preacher_id'),
            Filter::make('series_name', 'series'),
            ...QueryFilters::text('series_name'),
            ...QueryFilters::text('title'),
            ...QueryFilters::exact('media_type'),
            Filter::make('broadcasted_at', 'year')->applyWith(function ($q, $value) {
                $q->where(function ($sub) use ($value) {
                    foreach ((array) $value as $yr) {
                        $sub->orWhereYear('broadcasted_at', $yr);
                    }
                });
            }),
        ];
    }

    protected $fillable = [
        'title',
        'slug',
        'description',
        'youtube_id',
        'video_path',
        'embed_url',
        'thumbnail_path',
        'series_name',
        'source_type',
        'preacher_id',
        'views_count',
        'reaction_stats',
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
            'source_type' => VideoSourceType::class,
            'reaction_stats' => 'array',
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
