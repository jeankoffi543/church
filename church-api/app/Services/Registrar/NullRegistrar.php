<?php

declare(strict_types=1);

namespace App\Services\Registrar;

use App\Contracts\DomainRegistrar;
use App\Support\Domains\DomainQuote;

/**
 * No reseller configured (the default). RDAP still reports whether a domain is
 * free, but we can't quote a registration price for it.
 */
final class NullRegistrar implements DomainRegistrar
{
    public function quote(string $domain): ?DomainQuote
    {
        return null;
    }
}
