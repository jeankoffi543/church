<?php

declare(strict_types=1);

namespace App\Services\Signup;

use App\Models\Tenant;

/**
 * Whether a subdomain is free for a new church (CHR-172) — the single source of
 * truth for the signup wizard's debounced check AND the signup itself. Uniqueness
 * is checked through the model so it hits the CENTRAL connection (the `unique`
 * validation rule would query the default database in production).
 */
class SubdomainAvailability
{
    /** Subdomains reserved for the platform / infra. */
    public const RESERVED = [
        'www', 'app', 'admin', 'admins', 'api', 'central', 'platform', 'mail',
        'static', 'assets', 'churchapp', 'status', 'support', 'help', 'blog',
        'ftp', 'cdn', 'ns1', 'ns2', 'smtp', 'dashboard', 'account', 'billing',
    ];

    /**
     * @return array{available: bool, reason: string|null}
     */
    public function check(string $subdomain): array
    {
        $subdomain = strtolower(trim($subdomain));

        if (strlen($subdomain) < 3 || strlen($subdomain) > 40
            || preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $subdomain) !== 1) {
            return ['available' => false, 'reason' => 'invalid'];
        }

        if (in_array($subdomain, self::RESERVED, true)) {
            return ['available' => false, 'reason' => 'reserved'];
        }

        if (Tenant::query()->where('slug', $subdomain)->exists()) {
            return ['available' => false, 'reason' => 'taken'];
        }

        return ['available' => true, 'reason' => null];
    }
}
