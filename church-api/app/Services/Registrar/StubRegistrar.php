<?php

declare(strict_types=1);

namespace App\Services\Registrar;

use App\Contracts\DomainRegistrar;
use App\Support\Domains\DomainQuote;
use App\Support\Domains\DomainRegistrationResult;

/**
 * Deterministic, offline registrar for dev/tests (CHR-203). Prices are
 * illustrative (minor units of the configured currency); a real reseller driver
 * implements the same contract against its API. Selected with DOMAIN_REGISTRAR=stub.
 */
final class StubRegistrar implements DomainRegistrar
{
    /** Illustrative annual price (minor units) per TLD; others fall back to DEFAULT_PRICE. */
    private const TLD_PRICES = [
        'com' => 1200,
        'org' => 1400,
        'net' => 1300,
        'io' => 3500,
        'app' => 1600,
        'church' => 2800,
    ];

    private const DEFAULT_PRICE = 2000;

    public function __construct(private readonly string $currency = 'USD') {}

    public function quote(string $domain): ?DomainQuote
    {
        $labels = explode('.', $domain);
        if (count($labels) < 2) {
            return null;
        }

        $tld = (string) end($labels);
        $secondLevel = $labels[count($labels) - 2];
        $base = self::TLD_PRICES[$tld] ?? self::DEFAULT_PRICE;

        // Short second-level names are "premium" at most registrars.
        $premium = strlen($secondLevel) <= 3;
        $price = $premium ? $base * 5 : $base;

        return new DomainQuote($price, $this->currency, periodYears: 1, premium: $premium);
    }

    public function register(string $domain, int $years = 1): DomainRegistrationResult
    {
        // Deterministic "purchase" for dev/tests — no money, no network.
        return DomainRegistrationResult::success('stub-order-'.$domain);
    }

    public function renew(string $domain, int $years = 1): DomainRegistrationResult
    {
        return DomainRegistrationResult::success('stub-renew-'.$domain);
    }
}
