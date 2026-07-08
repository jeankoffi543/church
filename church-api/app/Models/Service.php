<?php

namespace App\Models;

use App\Support\QueryFilters;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Keky\QueryMaster\Concerns\HasFilters;
use Keky\QueryMaster\Concerns\IsSearchable;
use Keky\QueryMaster\Concerns\IsSortable;
use Keky\QueryMaster\Enums\SearchOperator;

/**
 * A single dated occurrence of a church gathering (culte dominical, étude
 * biblique, veillée, culte spécial…). Anchors {@see OfferingCollection}
 * (cash collected in person) and {@see Attendance} (headcount by category).
 *
 * @property int $id
 * @property string|null $title
 * @property string $type
 * @property Carbon $date
 * @property string|null $start_time
 * @property string|null $notes
 */
class Service extends Model
{
    use HasFactory, HasFilters, IsSearchable, IsSortable;

    protected array $searchable = [
        'title' => SearchOperator::LIKE,
        'type' => SearchOperator::LIKE,
    ];

    protected array $sortable = [
        'title',
        'type',
        'date',
        'created_at',
    ];

    public function filters(): array
    {
        return [
            ...QueryFilters::exact('type'),
            ...QueryFilters::text('title'),
        ];
    }

    protected $fillable = [
        'title',
        'type',
        'date',
        'start_time',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
        ];
    }

    /**
     * @return HasMany<OfferingCollection, $this>
     */
    public function offeringCollections(): HasMany
    {
        return $this->hasMany(OfferingCollection::class);
    }

    /**
     * @return HasMany<Attendance, $this>
     */
    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }
}
