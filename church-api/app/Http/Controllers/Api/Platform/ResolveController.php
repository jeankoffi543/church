<?php

namespace App\Http\Controllers\Api\Platform;

use App\Enums\SubscriptionStatus;
use App\Enums\TenantStatus;
use App\Http\Controllers\Controller;
use App\Models\Domain;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Public domain → tenant resolver for the Next.js proxy (CHR-144). Returns the
 * minimum the edge needs to route + theme a request: the tenant id and whether
 * it is currently servable. No sensitive data — a church's own domain is public.
 */
class ResolveController extends Controller
{
    public function resolve(Request $request): JsonResponse
    {
        $domain = Str::lower(trim((string) $request->query('domain', '')));

        if ($domain === '') {
            return response()->json(['message' => 'domain is required'], 422);
        }

        $tenant = Domain::query()->where('domain', $domain)->first()?->tenant;

        if ($tenant === null) {
            return response()->json(['message' => 'Aucune église pour ce domaine.'], 404);
        }

        $active = $tenant->status === TenantStatus::Active
            && ! in_array($tenant->subscription_status, [SubscriptionStatus::Suspended, SubscriptionStatus::Canceled], true);

        return response()->json([
            'tenant_id' => $tenant->id,
            'slug' => $tenant->slug,
            'status' => $tenant->status?->value,
            'active' => $active,
        ]);
    }
}
