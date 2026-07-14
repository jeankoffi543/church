<?php

declare(strict_types=1);

namespace App\Services\Signup;

use App\Models\Domain;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Whether an arbitrary domain (any TLD, not just a churchapp.io subdomain) is
 * usable for a new church (CHR-198). Checks, in order: format, the platform's
 * own reserved space, our own DB (already attached to a church), then the online
 * registry via RDAP (registered → taken, 404 → free to register). RDAP is
 * best-effort — an unreachable/unsupported registry yields "unknown", never a
 * false "available". Pairs with the subdomain check {@see SubdomainAvailability}.
 */
class DomainAvailabilityService
{
    private const RDAP_ENDPOINT = 'https://rdap.org/domain/';

    /**
     * @return array{name: string, available: bool|null, registered: bool|null, reason: string|null}
     */
    public function check(string $name): array
    {
        $name = $this->normalize($name);

        if (! $this->isValid($name)) {
            return $this->result($name, available: false, registered: null, reason: 'invalid');
        }

        if ($this->isReserved($name)) {
            return $this->result($name, available: false, registered: null, reason: 'reserved');
        }

        if (Domain::query()->where('domain', $name)->exists()) {
            return $this->result($name, available: false, registered: true, reason: 'taken');
        }

        return match ($this->registryLookup($name)) {
            true => $this->result($name, available: false, registered: true, reason: 'registered'),
            false => $this->result($name, available: true, registered: false, reason: null),
            default => $this->result($name, available: null, registered: null, reason: 'unknown'),
        };
    }

    private function normalize(string $name): string
    {
        $name = strtolower(trim($name));
        $name = preg_replace('#^https?://#', '', $name) ?? $name;
        $name = explode('/', $name)[0];

        return rtrim($name, '.');
    }

    private function isValid(string $name): bool
    {
        // At least one dot, labels 1-63 chars of [a-z0-9-], alphabetic TLD ≥ 2.
        return preg_match('/^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/', $name) === 1;
    }

    private function isReserved(string $name): bool
    {
        $root = strtolower((string) config('tenancy.central_root_domain'));

        return $root !== '' && ($name === $root || str_ends_with($name, '.'.$root));
    }

    /**
     * @return bool|null true = registered, false = free to register, null = undetermined
     */
    private function registryLookup(string $name): ?bool
    {
        try {
            $response = Http::timeout(4)->acceptJson()->get(self::RDAP_ENDPOINT.$name);

            if ($response->status() === 404) {
                return false; // no registry object → registrable
            }

            if ($response->successful()) {
                return true; // has an RDAP record → already registered
            }

            return null; // 429 / 5xx / redirect loop → can't tell
        } catch (Throwable) {
            return null; // network error / unsupported TLD
        }
    }

    /**
     * @return array{name: string, available: bool|null, registered: bool|null, reason: string|null}
     */
    private function result(string $name, ?bool $available, ?bool $registered, ?string $reason): array
    {
        return compact('name', 'available', 'registered', 'reason');
    }
}
