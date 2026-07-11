<?php

namespace App\Http\Controllers\Api\Platform;

use App\Http\Controllers\Controller;
use App\Models\StudioActivation;
use App\Models\Tenant;
use App\Services\StudioActivationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Studio Live activation keys (CHR-142). Key management is super-admin only;
 * activate/heartbeat are called by the studio-native app and authenticated by
 * the key itself (no session).
 */
class StudioController extends Controller
{
    // ── Key management (central super-admins) ───────────────────────────

    public function keys(Tenant $tenant): JsonResponse
    {
        $keys = StudioActivation::query()
            ->where('tenant_id', $tenant->id)
            ->latest('id')
            ->get()
            ->map(fn (StudioActivation $a): array => $this->keyPayload($a));

        return response()->json(['data' => $keys, 'seats' => (int) $tenant->studio_seats]);
    }

    public function createKey(Request $request, Tenant $tenant, StudioActivationService $studio): JsonResponse
    {
        abort_unless($tenant->studio_enabled, Response::HTTP_FORBIDDEN, "Le Studio Live n'est pas inclus dans l'offre de cette église.");

        $validated = $request->validate(['label' => ['required', 'string', 'max:255']]);

        $used = StudioActivation::query()->where('tenant_id', $tenant->id)->active()->count();
        abort_if(
            $used >= (int) $tenant->studio_seats,
            Response::HTTP_UNPROCESSABLE_ENTITY,
            "Toutes les licences Studio ({$tenant->studio_seats}) sont déjà utilisées.",
        );

        ['plain' => $plain, 'activation' => $activation] = $studio->generate($tenant, $validated['label']);

        return response()->json([
            // Shown ONCE — never retrievable again.
            'key' => $plain,
            'activation' => $this->keyPayload($activation),
        ], Response::HTTP_CREATED);
    }

    public function revokeKey(StudioActivation $activation): JsonResponse
    {
        $activation->update(['revoked_at' => now()]);

        return response()->json(['message' => 'Clé révoquée.']);
    }

    // ── Studio-native app (authenticated by the key) ────────────────────

    public function activate(Request $request, StudioActivationService $studio): JsonResponse
    {
        $validated = $request->validate([
            'key' => ['required', 'string'],
            'device_fingerprint' => ['nullable', 'string'],
        ]);

        return response()->json(
            $studio->activate($validated['key'], $validated['device_fingerprint'] ?? null),
        );
    }

    /**
     * Periodic re-check: re-validates the key (subscription may have lapsed),
     * refreshes last_seen_at and returns a fresh session token.
     */
    public function heartbeat(Request $request, StudioActivationService $studio): JsonResponse
    {
        $validated = $request->validate([
            'key' => ['required', 'string'],
            'device_fingerprint' => ['nullable', 'string'],
        ]);

        return response()->json(
            $studio->activate($validated['key'], $validated['device_fingerprint'] ?? null),
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function keyPayload(StudioActivation $activation): array
    {
        return [
            'id' => $activation->id,
            'label' => $activation->label,
            'key_prefix' => $activation->key_prefix,
            'bound_device' => $activation->device_fingerprint !== null,
            'last_seen_at' => $activation->last_seen_at?->toIso8601String(),
            'revoked_at' => $activation->revoked_at?->toIso8601String(),
        ];
    }
}
