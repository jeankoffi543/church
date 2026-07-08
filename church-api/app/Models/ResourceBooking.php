<?php

namespace App\Models;

use App\Support\QueryFilters;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Keky\QueryMaster\Concerns\HasFilters;
use Keky\QueryMaster\Concerns\IsSearchable;
use Keky\QueryMaster\Concerns\IsSortable;
use Keky\QueryMaster\Enums\SearchOperator;

/**
 * A reserved time slot for a {@see Resource}. Overlap with another
 * non-cancelled booking on the same resource is rejected at the controller
 * level (see ResourceBookingController::assertNoOverlap()).
 *
 * @property int $id
 * @property int $resource_id
 * @property string $title
 * @property Carbon $starts_at
 * @property Carbon $ends_at
 * @property int|null $booked_by
 * @property string|null $notes
 * @property string $status
 */
class ResourceBooking extends Model
{
    use HasFactory, HasFilters, IsSearchable, IsSortable;

    protected array $searchable = [
        'title' => SearchOperator::LIKE,
    ];

    protected array $sortable = [
        'title',
        'starts_at',
        'status',
        'created_at',
    ];

    public function filters(): array
    {
        return [
            ...QueryFilters::exact('resource_id'),
            ...QueryFilters::exact('status'),
            ...QueryFilters::text('title'),
        ];
    }

    protected $fillable = [
        'resource_id',
        'title',
        'starts_at',
        'ends_at',
        'booked_by',
        'notes',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<resource, $this>
     */
    public function resource(): BelongsTo
    {
        return $this->belongsTo(Resource::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function bookedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'booked_by');
    }

    /**
     * @param  Builder<ResourceBooking>  $query
     */
    public function scopeActive(Builder $query): void
    {
        $query->where('status', '!=', 'annule');
    }
}
