<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\StudioActivation;
use App\Services\PaystackBillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * A church's self-service billing (CHR-180). Runs in tenant context: the admin
 * sees their current plan + subscription status and can start / change their
 * subscription, paying through Paystack (activation is confirmed by the billing
 * webhook, CHR-141/175). The platform back-office keeps its own super-admin view
 * (CHR-183).
 */
class BillingController extends Controller
{
    public function show(): JsonResponse
    {
        $tenant = tenant();
        $subscription = $tenant->subscription;

        return response()->json(['data' => [
            'plan' => $this->planPayload($tenant->plan),
            'subscription_status' => $tenant->subscription_status?->value,
            'trial_ends_at' => $tenant->trial_ends_at?->toIso8601String(),
            'current_period_end' => $subscription?->current_period_end?->toIso8601String(),
            'features' => $tenant->activeFeatures(),
            'studio' => [
                'enabled' => (bool) $tenant->studio_enabled,
                'seats' => (int) $tenant->studio_seats,
                'used' => StudioActivation::query()->where('tenant_id', $tenant->id)->active()->count(),
            ],
            'plans' => Plan::query()->where('is_active', true)->orderBy('sort_order')->get()
                ->map(fn (Plan $plan): array => $this->planPayload($plan))->all(),
        ]]);
    }

    public function subscribe(Request $request, PaystackBillingService $billing): JsonResponse
    {
        $validated = $request->validate([
            'plan_code' => ['required', 'string', Rule::exists(Plan::class, 'code')],
            'email' => ['required', 'email'],
            'callback_url' => ['nullable', 'url', 'max:2048'],
        ]);

        $plan = Plan::query()->where('code', $validated['plan_code'])->firstOrFail();

        $subscription = $billing->initialize(tenant(), $plan, $validated['email'], $validated['callback_url'] ?? null);

        return response()->json([
            'authorization_url' => $subscription->authorization_url,
            'plan_code' => $plan->code,
            'status' => $subscription->status->value,
        ]);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function planPayload(?Plan $plan): ?array
    {
        if ($plan === null) {
            return null;
        }

        return [
            'code' => $plan->code,
            'name' => $plan->name,
            'price_month' => (int) $plan->price_month,
            'price_year' => (int) $plan->price_year,
            'currency' => $plan->currency,
            'features' => $plan->features ?? [],
            'studio_included' => (bool) $plan->studio_included,
        ];
    }
}
