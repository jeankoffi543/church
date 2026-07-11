<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gates a tenant route behind a product feature (feature-flipping). Used as
 * `feature:store`, `feature:studio`, … after the tenant has been resolved.
 */
class EnsureTenantHasFeature
{
    public function handle(Request $request, Closure $next, string $feature): Response
    {
        $tenant = tenant();

        if ($tenant !== null && ! $tenant->hasFeature($feature)) {
            abort(Response::HTTP_FORBIDDEN, "Cette fonctionnalité n'est pas incluse dans l'offre de votre église.");
        }

        return $next($request);
    }
}
