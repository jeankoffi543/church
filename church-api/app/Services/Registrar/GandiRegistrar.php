<?php

declare(strict_types=1);

namespace App\Services\Registrar;

use App\Contracts\DomainRegistrar;
use App\Support\Domains\DomainQuote;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Live domain pricing from the Gandi API v5 (CHR-205) — the reference real
 * reseller driver. Availability itself still comes from RDAP + our DB
 * (DomainAvailabilityService); this asks Gandi's `/domain/check` for the create
 * price of a domain we already believe to be free. Best-effort: any API error
 * yields `null` (no price), never a wrong one.
 *
 * Purchase (register()) is not here yet — it needs registrant contacts + a
 * billing flow (the next level-B tickets).
 */
final class GandiRegistrar implements DomainRegistrar
{
    public function __construct(
        private readonly ?string $apiKey,
        private readonly string $scheme = 'Apikey',
        private readonly string $endpoint = 'https://api.gandi.net/v5',
        private readonly string $currency = 'USD',
    ) {}

    public function quote(string $domain): ?DomainQuote
    {
        if (empty($this->apiKey)) {
            return null;
        }

        try {
            $response = Http::withHeaders(['Authorization' => trim($this->scheme).' '.$this->apiKey])
                ->acceptJson()
                ->timeout(5)
                ->get(rtrim($this->endpoint, '/').'/domain/check', [
                    'name' => $domain,
                    'processes' => 'create',
                    'currency' => $this->currency,
                ]);

            if (! $response->successful()) {
                return null;
            }

            return $this->toQuote($response->json());
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * @param  mixed  $body
     */
    private function toQuote($body): ?DomainQuote
    {
        if (! is_array($body)) {
            return null;
        }

        $product = $body['products'][0] ?? null;
        if (! is_array($product) || ($product['status'] ?? null) !== 'available') {
            return null;
        }

        $price = $product['prices'][0] ?? null;
        if (! is_array($price) || ! isset($price['price_before_taxes'])) {
            return null;
        }

        $currency = is_string($body['currency'] ?? null) ? $body['currency'] : $this->currency;
        $minorUnits = (int) round(((float) $price['price_before_taxes']) * 100);
        $years = max(1, (int) ($price['min_duration'] ?? 1));
        // Gandi flags premium names via a dedicated product type.
        $premium = ($product['tld_type'] ?? null) === 'premium' || (bool) ($product['premium'] ?? false);

        return new DomainQuote($minorUnits, $currency, periodYears: $years, premium: $premium);
    }
}
