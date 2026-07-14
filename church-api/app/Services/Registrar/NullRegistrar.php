<?php

declare(strict_types=1);

namespace App\Services\Registrar;

use App\Contracts\DomainRegistrar;
use App\Support\Domains\DomainQuote;
use App\Support\Domains\DomainRegistrationResult;

/**
 * No reseller configured (the default). RDAP still reports whether a domain is
 * free, but we can't quote a price for it or buy it.
 */
final class NullRegistrar implements DomainRegistrar
{
    public function quote(string $domain): ?DomainQuote
    {
        return null;
    }

    public function register(string $domain, int $years = 1): DomainRegistrationResult
    {
        return DomainRegistrationResult::failure('No domain registrar is configured.');
    }

    public function renew(string $domain, int $years = 1): DomainRegistrationResult
    {
        return DomainRegistrationResult::failure('No domain registrar is configured.');
    }
}
