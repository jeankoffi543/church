<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Logging\TenantProcessor;
use Stancl\Tenancy\Events\TenancyInitialized;

/**
 * Tag the error tracker's scope with the active church the moment tenancy
 * initializes (CHR-191), so exceptions are attributable per church. A no-op
 * until an error tracker (Sentry) is installed, so no hard dependency — the log
 * lines already carry the tenant via {@see TenantProcessor}.
 */
class TagObservabilityContext
{
    public function handle(TenancyInitialized $event): void
    {
        $tenant = $event->tenancy->tenant;

        if ($tenant === null) {
            return;
        }

        if (function_exists('Sentry\configureScope')) {
            \Sentry\configureScope(function (object $scope) use ($tenant): void {
                $scope->setTag('tenant_id', (string) $tenant->getTenantKey());
                $scope->setTag('tenant_slug', (string) $tenant->slug);
            });
        }
    }
}
