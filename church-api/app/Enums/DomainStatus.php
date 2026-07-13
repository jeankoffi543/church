<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Activation lifecycle of a custom domain (CHR-176), tracked alongside
 * {@see SslStatus}: a church adds a domain (Pending), the DNS-verify poller
 * confirms its ownership TXT record (Verified) — or gives up after the
 * propagation deadline (Failed) — and the church then promotes it to its live
 * primary hostname (Active). Platform subdomains are born Active.
 */
enum DomainStatus: string
{
    case Pending = 'pending';
    case Verified = 'verified';
    case Active = 'active';
    case Failed = 'failed';

    /** DNS ownership has been confirmed (whether or not it is the primary yet). */
    public function isVerified(): bool
    {
        return $this === self::Verified || $this === self::Active;
    }

    /** This is the tenant's live, primary hostname. */
    public function isLive(): bool
    {
        return $this === self::Active;
    }
}
