<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One line of the service-planning roster: a {@see Member} scheduled to
 * serve in a given role for a single {@see Service} occurrence, optionally
 * under a standing {@see Team}. One row per (service, member) —
 * re-submitting the roster for a service updates each line instead of
 * duplicating it, mirrors {@see Attendance} and {@see OfferingCollection}.
 *
 * @property int $id
 * @property int $service_id
 * @property int $member_id
 * @property int|null $team_id
 * @property string $role
 * @property string $status
 * @property string|null $notes
 */
class ServiceAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'service_id',
        'member_id',
        'team_id',
        'role',
        'status',
        'notes',
    ];

    /**
     * @return BelongsTo<Service, $this>
     */
    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    /**
     * @return BelongsTo<Member, $this>
     */
    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    /**
     * @return BelongsTo<Team, $this>
     */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }
}
