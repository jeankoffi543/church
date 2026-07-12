<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Jobs\ProvisionTenant;
use Stancl\Tenancy\Events\TenantCreated;

/**
 * Kick off a new church's database provisioning off the request (CHR-173).
 * Replaces the synchronous CreateDatabase → Migrate → Seed job pipeline: the
 * work now runs through {@see ProvisionTenant} on the queue, with a tracked
 * pending → provisioning → ready|failed lifecycle.
 */
class StartTenantProvisioning
{
    public function handle(TenantCreated $event): void
    {
        ProvisionTenant::dispatch($event->tenant);
    }
}
