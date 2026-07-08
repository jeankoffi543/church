<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * An aggregate cash total for one giving "nature" (dîme, offrande, projet…)
 * collected in person during a given {@see Service}. Unlike {@see Donation},
 * there is no donor identity — a plate collection is anonymous by nature.
 * One row per (service, nature): re-entering the same nature for a service
 * updates the existing total rather than creating a duplicate.
 *
 * @property int $id
 * @property int $service_id
 * @property string $nature
 * @property int $amount
 * @property string $currency
 * @property int|null $counted_by_id
 * @property string|null $notes
 */
class OfferingCollection extends Model
{
    use HasFactory;

    protected $fillable = [
        'service_id',
        'nature',
        'amount',
        'currency',
        'counted_by_id',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Service, $this>
     */
    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    /**
     * The staff member who counted and entered this total.
     *
     * @return BelongsTo<User, $this>
     */
    public function countedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'counted_by_id');
    }
}
