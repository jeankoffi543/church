<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Platform;

use App\Enums\DomainType;
use App\Http\Controllers\Controller;
use App\Models\Domain;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * On-demand TLS authorization for the edge (CHR-177). Caddy's
 * `on_demand_tls { ask <url> }` calls this before obtaining a certificate for a
 * hostname; a 2xx means "issue it", anything else means "refuse". Without this
 * gate anyone could point a domain at our edge and force unbounded ACME issuance.
 *
 * We authorize a hostname only when we already know it:
 *  - a church's custom domain whose ownership is verified (CHR-176), or
 *  - a platform subdomain that resolves to a tenant (these are normally covered
 *    by the `*.{root}` wildcard cert, so Caddy rarely asks — but allow them if it
 *    does).
 */
class TlsController extends Controller
{
    public function authorize(Request $request): JsonResponse
    {
        $host = Str::lower(trim((string) $request->query('domain', '')));
        $host = rtrim($host, '.');

        if ($host === '') {
            return response()->json(['authorized' => false, 'message' => 'domain is required'], 400);
        }

        $root = (string) config('tenancy.central_root_domain');
        $isPlatformHost = $host === $root || str_ends_with($host, '.'.$root);

        $domain = Domain::query()->where('domain', $host)->first();

        $authorized = $domain !== null && (
            $isPlatformHost
            || ($domain->type === DomainType::Custom && $domain->status?->isVerified() === true)
        );

        if (! $authorized) {
            return response()->json(['authorized' => false], 404);
        }

        return response()->json([
            'authorized' => true,
            'domain' => $host,
            'tenant_id' => $domain->tenant_id,
        ]);
    }
}
