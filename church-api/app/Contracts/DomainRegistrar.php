<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Support\Domains\DomainQuote;
use App\Support\Domains\DomainRegistrationResult;

/**
 * A domain reseller (CHR-203/206). RDAP tells us whether a domain is free (see
 * DomainAvailabilityService); a registrar adds the *price* and can *register* it.
 * A real driver (Gandi — CHR-205 — / OpenSRS / …) implements this against its
 * API; `null`/`stub` drivers stand in for "no reseller" and dev/tests.
 */
interface DomainRegistrar
{
    /**
     * Registration price for a domain the caller already knows to be free, or
     * `null` when the registrar can't price it (unsupported TLD / not configured).
     */
    public function quote(string $domain): ?DomainQuote;

    /**
     * Register (buy) a domain for `$years`, using the platform's configured
     * registrant contact. Returns a result rather than throwing so the caller can
     * surface the reseller's message; drivers that can't buy fail cleanly.
     */
    public function register(string $domain, int $years = 1): DomainRegistrationResult;

    /**
     * Renew a domain we already hold for `$years` more (CHR-210). Same result
     * contract as register().
     */
    public function renew(string $domain, int $years = 1): DomainRegistrationResult;
}
