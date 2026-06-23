<?php

namespace App\Models;

use Database\Factories\HomeGroupFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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
        'sort_order',
        'is_active',
        'created_at',
    ];

    public function filters(): array
    {
        return [
            Filter::make('is_active', 'is_active'),
            Filter::make('leader_id', 'leader_id'),
            Filter::make('zone_name', 'zone_name'),
            Filter::make('name', 'name'),
            Filter::make('day', 'meeting_day'),
            Filter::make('meeting_day', 'meeting_day'),
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
    public function leaderUser(): \Illuminate\Database\Eloquent\Relations\BelongsTo
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
