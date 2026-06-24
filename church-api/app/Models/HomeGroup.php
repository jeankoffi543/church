<?php

namespace App\Models;

use App\Support\QueryFilters;
use Database\Factories\HomeGroupFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Keky\QueryMaster\Concerns\HasFilters;
use Keky\QueryMaster\Concerns\IsSearchable;
use Keky\QueryMaster\Concerns\IsSortable;
use Keky\QueryMaster\Enums\SearchOperator;
use Keky\QueryMaster\Filter;

/**
 * @property string $name
 * @property string $leader
 * @property string $address
 * @property string|null $schedule
 * @property array<string, mixed>|null $coordinates
 * @property int $sort_order
 * @property bool $is_active
 */
class HomeGroup extends Model
{
    /** @use HasFactory<HomeGroupFactory> */
    use HasFactory, HasFilters, IsSearchable, IsSortable;

    protected array $searchable = [
        'name' => SearchOperator::LIKE,
        'leader' => SearchOperator::LIKE,
        'address' => SearchOperator::LIKE,
        'zone_name' => SearchOperator::LIKE,
    ];

    protected array $sortable = [
        'name',
        'leader',
        'address',
        'sort_order',
        'is_active',
        'created_at',
    ];

    public function filters(): array
    {
        return [
            ...QueryFilters::exact('is_active'),
            ...QueryFilters::exact('leader_id'),
            ...QueryFilters::exact('zone_name'),
            ...QueryFilters::text('name'),
            ...QueryFilters::text('leader'),
            ...QueryFilters::text('address'),
            // Day match is case-insensitive so "Mardi"/"mardi"/"MARDI" all hit.
            // `day`/`meeting_day` serve the public site; `meeting_day__eq` is what
            // the admin QueryBuilder <select> emits.
            ...array_map(
                fn (string $queryField) => Filter::make('meeting_day', $queryField)->applyWith(
                    fn ($q, $value) => $q->whereRaw('LOWER(meeting_day) = ?', [mb_strtolower((string) $value)])
                ),
                ['day', 'meeting_day', 'meeting_day__eq'],
            ),
        ];
    }

    protected $fillable = [
        'name',
        'leader',
        'address',
        'latitude',
        'longitude',
        'zone_name',
        'meeting_day',
        'meeting_time',
        'schedule',
        'coordinates',
        'sort_order',
        'is_active',
        'leader_id',
    ];

    /**
     * Get the user who leads this home group.
     */
    public function leaderUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'leader_id');
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'coordinates' => 'array',
            'latitude' => 'float',
            'longitude' => 'float',
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /**
     * @param  Builder<HomeGroup>  $query
     */
    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }

    /**
     * @param  Builder<HomeGroup>  $query
     */
    public function scopeOrdered(Builder $query): void
    {
        $query->orderBy('sort_order')->orderBy('id');
    }
}
