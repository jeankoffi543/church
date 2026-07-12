<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\Tenant;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gates a per-church identity route behind a SCOPED token (CHR-167): the identity
 * must present a token exchanged for THIS church (`tenant:{id}` ability), not its
 * broad `identity` login token. Least privilege — a leaked church token is useless
 * for any other church.
 */
class EnsureIdentityTenantScope
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $tenant = $request->route('tenant');
        $tenantId = $tenant instanceof Tenant ? $tenant->id : $tenant;

        if ($request->user() === null || ! $request->user()->tokenCan("tenant:{$tenantId}")) {
            abort(Response::HTTP_FORBIDDEN, 'Ce jeton n\'autorise pas l\'accès à cette église — échangez-le d\'abord.');
        }

        return $next($request);
    }
}
