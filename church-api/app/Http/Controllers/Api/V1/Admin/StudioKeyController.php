<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\StudioActivation;
use App\Services\StudioActivationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * A church's self-service Studio Live licences (CHR-180). Runs in tenant
 * context: the admin mints and revokes activation keys for their own operators,
 * within the seats their plan grants (studio_seats). The platform StudioController
 * keeps the same operations for super-admins across every church (CHR-142).
 */
class StudioKeyController extends Controller
{
    public function index(): JsonResponse
    {
        $tenant = tenant();

        $keys = StudioActivation::query()
            ->where('tenant_id', $tenant->id)
            ->latest('id')
            ->get()
            ->map(fn (StudioActivation $a): array => $this->payload($a));

        return response()->json([
            'data' => $keys,
            'seats' => (int) $tenant->studio_seats,
            'used' => StudioActivation::query()->where('tenant_id', $tenant->id)->active()->count(),
        ]);
    }

    public function store(Request $request, StudioActivationService $studio): JsonResponse
    {
        $tenant = tenant();

        abort_unless(
            (bool) $tenant->studio_enabled,
            Response::HTTP_FORBIDDEN,
            "Le Studio Live n'est pas inclus dans l'offre de votre église.",
        );

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
            'activation' => $this->payload($activation),
        ], Response::HTTP_CREATED);
    }

    public function revoke(StudioActivation $activation): JsonResponse
    {
        abort_unless($activation->tenant_id === tenant('id'), Response::HTTP_NOT_FOUND);

        $activation->update(['revoked_at' => now()]);

        return response()->json(['message' => 'Licence révoquée.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(StudioActivation $activation): array
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
