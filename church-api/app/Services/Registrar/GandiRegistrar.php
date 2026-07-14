<?php

declare(strict_types=1);

namespace App\Services\Registrar;

use App\Contracts\DomainRegistrar;
use App\Support\Domains\DomainQuote;
use App\Support\Domains\DomainRegistrationResult;
use App\Support\Domains\RegistrantContact;
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
    /**
     * @param  list<string>  $nameservers
     */
    public function __construct(
        private readonly ?string $apiKey,
        private readonly string $scheme = 'Apikey',
        private readonly string $endpoint = 'https://api.gandi.net/v5',
        private readonly string $currency = 'USD',
        private readonly ?RegistrantContact $owner = null,
        private readonly array $nameservers = [],
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

    public function register(string $domain, int $years = 1): DomainRegistrationResult
    {
        if (empty($this->apiKey)) {
            return DomainRegistrationResult::failure('Gandi API key is not configured.');
        }

        if ($this->owner === null) {
            return DomainRegistrationResult::failure('Registrant contact is not configured (domains.registrar.owner).');
        }

        try {
            $payload = [
                'fqdn' => $domain,
                'duration' => max(1, $years),
                'owner' => $this->owner->toGandi(),
                'currency' => $this->currency,
            ];
            if ($this->nameservers !== []) {
                $payload['nameservers'] = array_values($this->nameservers);
            }

            $response = Http::withHeaders(['Authorization' => trim($this->scheme).' '.$this->apiKey])
                ->acceptJson()
                ->timeout(20)
                ->post(rtrim($this->endpoint, '/').'/domain/domains', $payload);

            if (in_array($response->status(), [200, 201, 202], true)) {
                $body = $response->json();
                $reference = is_array($body) ? ($body['id'] ?? $body['href'] ?? null) : null;

                return DomainRegistrationResult::success(is_string($reference) ? $reference : null);
            }

            $body = $response->json();
            $message = is_array($body) && isset($body['message']) && is_string($body['message'])
                ? $body['message']
                : 'Gandi registration failed (HTTP '.$response->status().').';

            return DomainRegistrationResult::failure($message);
        } catch (Throwable) {
            return DomainRegistrationResult::failure('Could not reach the Gandi API.');
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
