<?php

namespace App\Http\Controllers\Api\Platform;

use App\Http\Controllers\Controller;
use App\Http\Requests\Platform\PlanRequest;
use App\Models\Plan;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;

/**
 * Subscription plans (central). `index` is the public catalogue behind the SaaS
 * pricing page (CHR-146, no auth). `manage`/`store`/`update`/`destroy` are the
 * super-admin CRUD (CHR-196) — the owner customizes every plan; gated by the
 * route middleware (auth:central + super-admin).
 */
class PlanController extends Controller
{
    public function index(): JsonResponse
    {
        $plans = Plan::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get()
            ->map(fn (Plan $plan): array => [
                'code' => $plan->code,
                'name' => $plan->name,
                'price_month' => $plan->price_month,
                'price_year' => $plan->price_year,
                'currency' => $plan->currency,
                'features' => $plan->features ?? [],
                'limits' => $plan->limits ?? [],
                'studio_included' => $plan->studio_included,
            ]);

        return response()->json(['data' => $plans]);
    }

    /** Full catalogue (incl. inactive) for the super-admin console. */
    public function manage(): JsonResponse
    {
        $plans = Plan::query()
            ->orderBy('sort_order')
            ->get()
            ->map(fn (Plan $plan): array => $this->adminArray($plan));

        return response()->json(['data' => $plans]);
    }

    public function store(PlanRequest $request): JsonResponse
    {
        $plan = Plan::query()->create($this->payload($request));

        return response()->json(['data' => $this->adminArray($plan)], 201);
    }

    public function update(PlanRequest $request, Plan $plan): JsonResponse
    {
        $plan->update($this->payload($request));

        return response()->json(['data' => $this->adminArray($plan->refresh())]);
    }

    public function destroy(Plan $plan): JsonResponse
    {
        // plan_id is nullOnDelete, so deleting would silently strip the plan from
        // every church on it. Force the owner to deactivate (or reassign) instead.
        if (Tenant::query()->where('plan_id', $plan->getKey())->exists()) {
            return response()->json([
                'message' => 'Ce plan est utilisé par des églises ; désactivez-le plutôt que de le supprimer.',
            ], 422);
        }

        $plan->delete();

        return response()->json(['message' => 'Plan supprimé.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(PlanRequest $request): array
    {
        $v = $request->validated();

        return [
            'code' => $v['code'],
            'name' => $v['name'],
            'price_month' => $v['price_month'],
            'price_year' => $v['price_year'],
            'currency' => strtoupper((string) $v['currency']),
            'paystack_plan_code' => $v['paystack_plan_code'] ?? null,
            'features' => array_values(array_unique($v['features'] ?? [])),
            'limits' => $v['limits'] ?? null,
            'studio_included' => $v['studio_included'] ?? false,
            'sort_order' => $v['sort_order'] ?? 0,
            'is_active' => $v['is_active'] ?? true,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function adminArray(Plan $plan): array
    {
        return [
            'id' => $plan->getKey(),
            'code' => $plan->code,
            'name' => $plan->name,
            'price_month' => $plan->price_month,
            'price_year' => $plan->price_year,
            'currency' => $plan->currency,
            'paystack_plan_code' => $plan->paystack_plan_code,
            'features' => $plan->features ?? [],
            'limits' => $plan->limits ?? [],
            'studio_included' => $plan->studio_included,
            'sort_order' => $plan->sort_order,
            'is_active' => $plan->is_active,
        ];
    }
}
