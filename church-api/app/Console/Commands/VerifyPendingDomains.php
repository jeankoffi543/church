<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Jobs\VerifyCustomDomain;
use App\Models\Domain;
use Illuminate\Console\Command;

/**
 * DNS-verify poller (CHR-176). Sweeps every custom domain still awaiting its
 * ownership TXT record and dispatches a {@see VerifyCustomDomain} job for each,
 * so churches don't have to keep clicking "verify" — the domain auto-activates
 * once DNS propagates (or fails out after the deadline). Domains are central, so
 * this runs once centrally rather than per-tenant.
 */
class VerifyPendingDomains extends Command
{
    protected $signature = 'domains:verify-pending';

    protected $description = 'Re-check DNS for custom domains awaiting verification and auto-verify them.';

    public function handle(): int
    {
        $count = 0;

        Domain::query()->awaitingVerification()->each(function (Domain $domain) use (&$count): void {
            VerifyCustomDomain::dispatch($domain);
            $count++;
        });

        $this->info("Dispatched verification for {$count} pending domain(s).");

        return self::SUCCESS;
    }
}
