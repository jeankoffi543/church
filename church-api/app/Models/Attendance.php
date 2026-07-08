<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * An aggregate headcount for one category (hommes, femmes, enfants,
 * visiteurs…) at a given {@see Service}. One row per (service, category);
 * re-entering the same category for a service updates its count instead of
 * duplicating it — mirrors {@see OfferingCollection}.
 *
 * @property int $id
 * @property int $service_id
 * @property string $category
 * @property int $count
 * @property int|null $recorded_by_id
 */
class Attendance extends Model
{
    use HasFactory;

    protected $fillable = [
        'service_id',
        'category',
        'count',
        'recorded_by_id',
    ];

    protected function casts(): array
    {
        return [
            'count' => 'integer',
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
    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by_id');
    }
}
