<?php

namespace App\Models;

use App\Support\QueryFilters;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Carbon;
use Keky\QueryMaster\Concerns\HasFilters;
use Keky\QueryMaster\Concerns\IsSortable;

/**
 * A discipleship/pastoral-care case for a {@see Convert} or a {@see Member}
 * (`followable`) — sensitive data, scoped to the assigned counselor unless
 * the viewer validates globally (see AccessControl::viewsFollowUpsGlobally).
 *
 * @property int $id
 * @property string $followable_type
 * @property int $followable_id
 * @property int|null $assigned_to
 * @property string $status
 * @property Carbon|null $next_action_date
 */
class FollowUp extends Model
{
    use HasFactory, HasFilters, IsSortable;

    protected array $sortable = [
        'status',
        'next_action_date',
        'created_at',
    ];

    public function filters(): array
    {
        return [
            ...QueryFilters::exact('status'),
            ...QueryFilters::exact('assigned_to'),
            ...QueryFilters::exact('followable_type'),
        ];
    }

    protected $fillable = [
        'followable_type',
        'followable_id',
        'assigned_to',
        'status',
        'next_action_date',
    ];

    protected function casts(): array
    {
        return [
            'next_action_date' => 'date',
        ];
    }

    /**
     * @return MorphTo<Model, $this>
     */
    public function followable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function counselor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * @return HasMany<FollowUpNote, $this>
     */
    public function notes(): HasMany
    {
        return $this->hasMany(FollowUpNote::class)->latest();
    }
}
