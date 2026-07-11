<?php

namespace App\Http\Controllers\Api\Platform;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\Tenant;
use App\Services\PaystackBillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Starts a tenant's platform subscription (central back-office). Returns the
 * Paystack checkout URL the church pays through; activation is confirmed by the
 * billing webhook (CHR-141).
 */
class SubscriptionController extends Controller
{
    public function subscribe(Request $request, Tenant $tenant, PaystackBillingService $billing): JsonResponse
    {
        $validated = $request->validate([
            'plan_code' => ['required', 'string', Rule::exists(Plan::class, 'code')],
            'email' => ['required', 'email'],
        ]);

        $plan = Plan::query()->where('code', $validated['plan_code'])->firstOrFail();

        $subscription = $billing->initialize($tenant, $plan, $validated['email']);

        return response()->json([
            'authorization_url' => $subscription->authorization_url,
            'subscription' => [
                'id' => $subscription->id,
                'status' => $subscription->status->value,
                'plan_code' => $plan->code,
            ],
        ]);
    }
}
