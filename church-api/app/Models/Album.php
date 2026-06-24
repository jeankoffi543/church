<?php

namespace App\Models;

use App\Support\QueryFilters;
use Database\Factories\AlbumFactory;
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
 * @property int|null $event_id
 * @property string|null $cover_image
 * @property Carbon $created_at
 */
class Album extends Model
{
    /** @use HasFactory<AlbumFactory> */
    use HasFactory, HasFilters, IsSearchable, IsSortable;

    protected array $searchable = [
        'title' => SearchOperator::LIKE,
        'description' => SearchOperator::LIKE,
    ];

    protected array $sortable = [
        'title',
        'photos_count',
        'created_at',
    ];

    public function filters(): array
    {
        return [
            ...QueryFilters::exact('event_id'),
            ...QueryFilters::text('title'),
            Filter::make('category', 'category')->applyWith(function ($q, $value) {
                $q->whereHas('event', fn ($e) => $e->whereIn('type', (array) $value));
            }),
            Filter::make('category', 'category__eq')->applyWith(function ($q, $value) {
                $q->whereHas('event', fn ($e) => $e->where('type', $value));
            }),
            Filter::make('category', 'category__lk')->applyWith(function ($q, $value) {
                $q->whereHas('event', fn ($e) => $e->where('type', 'LIKE', "%{$value}%"));
            }),
            Filter::make('created_at', 'year')->applyWith(function ($q, $value) {
                $q->where(function ($sub) use ($value) {
                    foreach ((array) $value as $yr) {
                        $sub->orWhereYear('created_at', $yr);
                    }
                });
            }),
        ];
    }

    protected $fillable = [
        'title',
        'slug',
        'description',
        'event_id',
        'cover_image',
    ];

    /**
     * Photos belonging to this album, ordered by their explicit position.
     *
     * @return HasMany<AlbumPhoto, $this>
     */
    public function photos(): HasMany
    {
        return $this->hasMany(AlbumPhoto::class)->orderBy('order')->orderBy('id');
    }

    /**
     * The event this album documents (optional).
     *
     * @return BelongsTo<Event, $this>
     */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    /**
     * @param  Builder<Album>  $query
     */
    public function scopeLatestFirst(Builder $query): void
    {
        $query->orderByDesc('created_at')->orderByDesc('id');
    }
}
