<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Contracts\DomainRegistrar;
use App\Models\Domain;
use Illuminate\Console\Command;

/**
 * Auto-renew platform-registered domains nearing expiry (CHR-210). Renewal is a
 * plan benefit (CHR-209), so no charge here. BYO domains (null expiry) are never
 * touched. Runs centrally — domains live on the central DB.
 */
class RenewExpiringDomains extends Command
{
    protected $signature = 'domains:renew {--days=30 : Renew domains expiring within this many days}';

    protected $description = 'Auto-renew platform-registered domains nearing expiry.';

    public function handle(DomainRegistrar $registrar): int
    {
        $days = max(1, (int) $this->option('days'));
        $renewed = 0;
        $failed = 0;

        Domain::query()->expiringWithin($days)->each(function (Domain $domain) use ($registrar, &$renewed, &$failed): void {
            $result = $registrar->renew($domain->domain, 1);

            if (! $result->successful) {
                $failed++;
                $this->warn("Could not renew {$domain->domain}: {$result->message}");

                return;
            }

            // Registrars extend from the current expiry, not from today.
            $domain->forceFill(['expires_at' => $domain->expires_at?->copy()->addYear() ?? now()->addYear()])->save();
            $renewed++;
            $this->info("Renewed {$domain->domain}.");
        });

        $this->info("Domains renewed: {$renewed}, failed: {$failed}.");

        return self::SUCCESS;
    }
}
