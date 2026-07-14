<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Support\Domains\DomainQuote;

/**
 * A domain reseller (CHR-203). RDAP already tells us whether a domain is free
 * (see DomainAvailabilityService); a registrar adds the *price* to register it.
 *
 * Actual purchase — `register()` — is deliberately NOT on this contract yet: it
 * needs a real reseller account, WHOIS/contact handling, a billing flow and
 * renewals (the level-B epic). The concrete drivers here (null / stub) only
 * price, so no fake "buy" surface ships. A real driver (Gandi / OpenSRS / …)
 * implements this same interface against its API.
 */
interface DomainRegistrar
{
    /**
     * Registration price for a domain the caller already knows to be free, or
     * `null` when the registrar can't price it (unsupported TLD / not configured).
     */
    public function quote(string $domain): ?DomainQuote;
}
