<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Identity;

use App\Http\Controllers\Controller;
use App\Models\Identity;
use App\Models\Membership;
use App\Models\PushSubscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * RGPD self-service for a churchgoer's global account (CHR-190): export every
 * piece of data we hold, and erase the account outright. Central context, on the
 * `identity` guard.
 */
class AccountController extends Controller
{
    /** Data portability — the full picture of what we store on this identity. */
    public function export(Request $request): JsonResponse
    {
        /** @var Identity $identity */
        $identity = $request->user();

        return response()->json(['data' => [
            'identity' => [
                'id' => $identity->id,
                'name' => $identity->name,
                'email' => $identity->email,
                'phone' => $identity->phone,
                'created_at' => $identity->created_at?->toIso8601String(),
            ],
            'memberships' => $identity->memberships()->with('tenant')->get()->map(fn (Membership $m): array => [
                'church' => $m->tenant?->name,
                'status' => $m->status->value,
                'since' => $m->created_at?->toIso8601String(),
            ]),
            'devices' => $identity->pushSubscriptions()->get()->map(fn (PushSubscription $s): array => [
                'platform' => $s->platform,
                'tenant_id' => $s->tenant_id,
            ]),
            'exported_at' => now()->toIso8601String(),
        ]]);
    }

    /** Right to erasure — delete the identity and everything linked to it. */
    public function destroy(Request $request): JsonResponse
    {
        /** @var Identity $identity */
        $identity = $request->user();

        // push_subscriptions.identity_id is nullOnDelete, so drop them outright;
        // memberships cascade via FK but are removed explicitly for clarity.
        $identity->pushSubscriptions()->delete();
        $identity->memberships()->delete();
        $identity->tokens()->delete();

        $identity->delete();

        return response()->json(['message' => 'Votre compte et vos données ont été supprimés.']);
    }
}
