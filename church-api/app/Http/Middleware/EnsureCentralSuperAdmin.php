<?php

namespace App\Http\Middleware;

use App\Models\CentralUser;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Restricts a platform route to central super-admins (support/billing staff are
 * read-only for now). Runs after `auth:central`.
 */
class EnsureCentralSuperAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof CentralUser || ! $user->isSuperAdmin()) {
            abort(Response::HTTP_FORBIDDEN, 'Action réservée aux super-administrateurs de la plateforme.');
        }

        return $next($request);
    }
}
