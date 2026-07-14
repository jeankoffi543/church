<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Domain;

/**
 * Custom-domain ownership verification (CHR-148). The church publishes the
 * token as a TXT record; once we see it, the domain is verified and the edge
 * (Caddy on-demand TLS) issues its certificate on first request.
 */
class DomainVerificationService
{
    private const TXT_HOST = '_churchapp-verify';

    /**
     * The DNS records the church must publish.
     *
     * @return array<string, mixed>
     */
    public function instructions(Domain $domain): array
    {
        // The edge routes by Host + issues the cert on-demand (CHR-177), so a
        // church only points a CNAME at the platform — never a per-tenant vhost.
        $target = config('tenancy.custom_domain_target', config('tenancy.central_root_domain'));

        return [
            'cname' => [
                'type' => 'CNAME',
                'host' => $domain->domain,
                'target' => $target,
            ],
            'txt' => [
                'type' => 'TXT',
                'host' => self::TXT_HOST.'.'.$domain->domain,
                'value' => $domain->verification_token,
            ],
        ];
    }

    /**
     * Whether the ownership TXT record is live for this domain.
     */
    public function verify(Domain $domain): bool
    {
        if ($domain->verification_token === null) {
            return false;
        }

        $records = @dns_get_record(self::TXT_HOST.'.'.$domain->domain, DNS_TXT) ?: [];

        foreach ($records as $record) {
            if (($record['txt'] ?? null) === $domain->verification_token) {
                return true;
            }
        }

        return false;
    }
}
