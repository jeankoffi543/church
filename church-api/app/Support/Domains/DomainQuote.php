<?php

declare(strict_types=1);

namespace App\Support\Domains;

/**
 * A registrar's price to register a domain (CHR-203). `price` is in minor units
 * of `currency` (e.g. cents), consistent with plans and store products.
 */
final readonly class DomainQuote
{
    public function __construct(
        public int $price,
        public string $currency,
        public int $periodYears = 1,
        public bool $premium = false,
    ) {}

    /**
     * @return array{price: int, currency: string, period_years: int, premium: bool}
     */
    public function toArray(): array
    {
        return [
            'price' => $this->price,
            'currency' => $this->currency,
            'period_years' => $this->periodYears,
            'premium' => $this->premium,
        ];
    }
}
