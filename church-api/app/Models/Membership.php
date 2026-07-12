<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\MembershipStatus;
use Database\Factories\MembershipFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Stancl\Tenancy\Database\Concerns\CentralConnection;

/**
 * An identity's link to a church (CHR-166) — following it, and possibly claimed
 * to that church's own local member record ({@see $local_member_id}, a row in the
 * tenant's DB). Central; see the migration for the cross-DB note.
 */
class Membership extends Model
{
    /** @use HasFactory<MembershipFactory> */
    use CentralConnection, HasFactory;

    protected $fillable = [
        'identity_id',
        'tenant_id',
        'local_member_id',
        'status',
        'is_public',
        'claimed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => MembershipStatus::class,
            'is_public' => 'boolean',
            'claimed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Identity, $this>
     */
    public function identity(): BelongsTo
    {
        return $this->belongsTo(Identity::class);
    }

    /**
     * @return BelongsTo<Tenant, $this>
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /** Whether this identity has claimed a local member record in the church. */
    public function isClaimed(): bool
    {
        return $this->local_member_id !== null;
    }
}
