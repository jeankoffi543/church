<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Identity;

use App\Http\Controllers\Controller;
use App\Models\Member;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Central → tenant token exchange (CHR-167). An identity trades its broad login
 * token for a token SCOPED to a single church it follows (`tenant:{id}` ability),
 * then uses that to reach per-church endpoints (least privilege).
 */
class TenantAccessController extends Controller
{
    /** Exchange the identity token for a token scoped to one church. */
    public function token(Request $request, Tenant $tenant): JsonResponse
    {
        $identity = $request->user();

        if (! $identity->memberships()->where('tenant_id', $tenant->id)->exists()) {
            return response()->json(['message' => "Suivez d'abord cette église pour obtenir un accès."], 403);
        }

        $ability = "tenant:{$tenant->id}";

        return response()->json([
            'token' => $identity->createToken("church:{$tenant->id}", [$ability])->plainTextToken,
            'tenant_id' => $tenant->id,
            'church' => $tenant->name,
            'abilities' => [$ability],
        ]);
    }

    /**
     * The identity's profile AT this church — the follow status plus, if claimed,
     * the church's own member record (read from the tenant DB). Requires a token
     * scoped to this church (EnsureIdentityTenantScope).
     */
    public function member(Request $request, Tenant $tenant): JsonResponse
    {
        $membership = $request->user()->memberships()->where('tenant_id', $tenant->id)->firstOrFail();

        $localMember = null;

        if ($membership->local_member_id !== null) {
            tenancy()->initialize($tenant);

            try {
                $localMember = Member::query()
                    ->whereKey($membership->local_member_id)
                    ->first(['id', 'name', 'email', 'phone', 'member_type', 'status']);
            } finally {
                tenancy()->end();
            }
        }

        return response()->json(['data' => [
            'church' => $tenant->name,
            'status' => $membership->status->value,
            'member' => $localMember,
        ]]);
    }
}
