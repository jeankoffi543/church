<?php

namespace App\Http\Middleware;

use App\Enums\SubscriptionStatus;
use App\Enums\TenantStatus;
use App\Models\Tenant;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Runs after the tenant has been resolved: refuses to serve a church whose
 * infrastructure isn't live or whose subscription has lapsed, so a suspended
 * tenant gets a clean "unavailable" answer instead of leaking a working app.
 */
class EnsureTenantIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Tenant|null $tenant */
        $tenant = tenant();

        if ($tenant === null) {
            return $next($request);
        }

        $blockedSubscription = in_array(
            $tenant->subscription_status,
            [SubscriptionStatus::Suspended, SubscriptionStatus::Canceled],
            true,
        );

        if ($tenant->status !== TenantStatus::Active || $blockedSubscription) {
            abort(Response::HTTP_FORBIDDEN, "Cette église est momentanément indisponible. L'abonnement est peut-être suspendu.");
        }

        return $next($request);
    }
}
