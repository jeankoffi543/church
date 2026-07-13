<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\DomainStatus;
use App\Models\Domain;
use App\Services\DomainVerificationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Middleware\WithoutOverlapping;

/**
 * Re-check a custom domain's ownership TXT record off the request (CHR-176).
 * Dispatched in bulk by the domains:verify-pending poller: on a hit the domain
 * moves to Verified (and the edge may issue its certificate); once the
 * propagation deadline passes with no record it moves to Failed; otherwise the
 * probe time is noted and it stays Pending for the next sweep.
 *
 * Idempotent: a domain that is no longer Pending (already verified/failed, or
 * verified out-of-band) is left untouched.
 */
class VerifyCustomDomain implements ShouldQueue
{
    use Queueable;

    /** Hours a domain may sit unverified before the poller gives up. */
    private const TTL_HOURS = 72;

    public function __construct(public Domain $domain) {}

    /**
     * @return array<int, object>
     */
    public function middleware(): array
    {
        return [(new WithoutOverlapping('domain-verify:'.$this->domain->getKey()))->dontRelease()->expireAfter(300)];
    }

    public function handle(DomainVerificationService $verifier): void
    {
        $domain = $this->domain->fresh();

        if ($domain === null || $domain->status !== DomainStatus::Pending) {
            return;
        }

        if ($verifier->verify($domain)) {
            $domain->markVerified();

            return;
        }

        $deadline = now()->subHours((int) config('tenancy.domain_verification_ttl_hours', self::TTL_HOURS));

        if ($domain->created_at !== null && $domain->created_at->lt($deadline)) {
            $domain->markVerificationFailed();

            return;
        }

        $domain->touchVerificationCheck();
    }
}
