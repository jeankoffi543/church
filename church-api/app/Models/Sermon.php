<?php

namespace App\Models;

use App\Enums\SermonMediaType;
use App\Support\QueryFilters;
use Database\Factories\SermonFactory;
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
 * @property string|null $series
 * @property string $title
 * @property string|null $description
 * @property string $speaker
 * @property int|null $user_id
 * @property string|null $book
 * @property array<int, string>|null $books_category
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
    use HasFactory, HasFilters, IsSearchable, IsSortable;

    protected array $searchable = [
        'title' => SearchOperator::LIKE,
        'description' => SearchOperator::LIKE,
        'speaker' => SearchOperator::LIKE,
        'series' => SearchOperator::LIKE,
    ];

    protected array $sortable = [
        'title',
        'speaker',
        'preached_at',
        'is_published',
        'created_at',
    ];

    public function filters(): array
    {
        return [
            ...QueryFilters::exact('is_published'),
            ...QueryFilters::exact('speaker'),
            ...QueryFilters::text('title'),
            ...QueryFilters::text('series'),
            ...QueryFilters::exact('book'),
            ...QueryFilters::exact('user_id'),
            ...QueryFilters::exact('user_id', 'preacher'),
            Filter::make('preached_at', 'date'),
            Filter::make('preached_at', 'year')->applyWith(function ($q, $value) {
                $q->where(function ($sub) use ($value) {
                    foreach ((array) $value as $yr) {
                        $sub->orWhereYear('preached_at', $yr);
                    }
                });
            }),
        ];
    }

    protected $fillable = [
        'series',
        'title',
        'description',
        'speaker',
        'user_id',
        'book',
        'books_category',
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
            'books_category' => 'array',
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
     * The preacher (a user) who delivered this sermon.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
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
