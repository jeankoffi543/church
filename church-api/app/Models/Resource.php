<?php

namespace App\Models;

use App\Support\QueryFilters;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Keky\QueryMaster\Concerns\HasFilters;
use Keky\QueryMaster\Concerns\IsSearchable;
use Keky\QueryMaster\Concerns\IsSortable;
use Keky\QueryMaster\Enums\SearchOperator;

/**
 * A bookable church asset — a room, a vehicle, or equipment. The inventory
 * and its {@see ResourceBooking} reservations share this one model, since a
 * resource can only be booked because it's inventoried.
 *
 * @property int $id
 * @property string $name
 * @property string $type
 * @property string|null $description
 * @property string|null $location
 * @property string $condition
 * @property bool $is_active
 */
class Resource extends Model
{
    use HasFactory, HasFilters, IsSearchable, IsSortable;

    protected array $searchable = [
        'name' => SearchOperator::LIKE,
        'location' => SearchOperator::LIKE,
    ];

    protected array $sortable = [
        'name',
        'type',
        'condition',
        'created_at',
    ];

    public function filters(): array
    {
        return [
            ...QueryFilters::exact('type'),
            ...QueryFilters::exact('is_active'),
            ...QueryFilters::exact('condition'),
            ...QueryFilters::text('name'),
        ];
    }

    protected $fillable = [
        'name',
        'type',
        'description',
        'location',
        'condition',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return HasMany<ResourceBooking, $this>
     */
    public function bookings(): HasMany
    {
        return $this->hasMany(ResourceBooking::class);
    }
}
