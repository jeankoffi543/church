<?php

namespace App\Http\Controllers\Api\Platform;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Http\JsonResponse;

/**
 * Public catalogue of active plans (central) — powers the SaaS marketing
 * pricing page (CHR-146). No auth: pricing is public.
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
}
