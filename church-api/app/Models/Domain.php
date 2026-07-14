<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\DomainStatus;
use App\Enums\DomainType;
use App\Enums\SslStatus;
use Database\Factories\DomainFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Stancl\Tenancy\Database\Models\Domain as BaseDomain;

/**
 * A hostname that resolves to a tenant. Extends the stancl base model (central
 * connection, occupancy guard, lowercase normalisation) and adds the resolution
 * metadata introduced in CHR-134 and the activation state machine of CHR-176.
 */
class Domain extends BaseDomain
{
    /** @use HasFactory<DomainFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => DomainType::class,
            'status' => DomainStatus::class,
            'ssl_status' => SslStatus::class,
            'is_primary' => 'boolean',
            'verified_at' => 'datetime',
            'last_checked_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    /**
     * Custom domains still waiting on their ownership TXT record — the set the
     * DNS-verify poller re-checks (CHR-176).
     *
     * @param  Builder<Domain>  $query
     */
    public function scopeAwaitingVerification(Builder $query): void
    {
        $query->where('type', DomainType::Custom)->where('status', DomainStatus::Pending);
    }

    /**
     * Platform-registered domains (they carry an `expires_at`) due for renewal
     * within `$days` — BYO domains (null expiry) are never in this set (CHR-210).
     *
     * @param  Builder<Domain>  $query
     */
    public function scopeExpiringWithin(Builder $query, int $days): void
    {
        $query->whereNotNull('expires_at')->where('expires_at', '<=', now()->addDays($days));
    }

    /**
     * DNS ownership confirmed: the domain is verified and the edge may issue its
     * certificate. Never demotes an already-live (primary) domain.
     */
    public function markVerified(): void
    {
        $this->forceFill([
            'status' => $this->status === DomainStatus::Active ? DomainStatus::Active : DomainStatus::Verified,
            'verified_at' => $this->verified_at ?? now(),
            'ssl_status' => SslStatus::Issued,
            'last_checked_at' => now(),
        ])->save();
    }

    /** The ownership TXT record never appeared within the propagation deadline. */
    public function markVerificationFailed(): void
    {
        $this->forceFill([
            'status' => DomainStatus::Failed,
            'ssl_status' => SslStatus::Failed,
            'last_checked_at' => now(),
        ])->save();
    }

    /** Record a DNS probe that did not (yet) find the record. */
    public function touchVerificationCheck(): void
    {
        $this->forceFill(['last_checked_at' => now()])->save();
    }

    /**
     * Promote a verified domain to the tenant's live primary hostname, demoting
     * whatever held the primary slot. Wrapped in the central connection's
     * transaction so the tenant never briefly has two primaries or none.
     */
    public function activate(): void
    {
        $this->getConnection()->transaction(function (): void {
            static::query()
                ->where('tenant_id', $this->tenant_id)
                ->where('is_primary', true)
                ->whereKeyNot($this->getKey())
                ->update(['is_primary' => false, 'status' => DomainStatus::Verified->value]);

            $this->forceFill(['is_primary' => true, 'status' => DomainStatus::Active])->save();
        });
    }
}
