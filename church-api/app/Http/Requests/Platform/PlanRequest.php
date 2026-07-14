<?php

declare(strict_types=1);

namespace App\Http\Requests\Platform;

use App\Enums\Feature;
use App\Models\Plan;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Create/update rules for a subscription plan (CHR-196). Authorization is done
 * by the route middleware (auth:central + super-admin); this only validates.
 * PUT semantics — the console submits the whole plan.
 */
class PlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $plan = $this->route('plan');
        $planId = $plan instanceof Plan ? $plan->getKey() : null;

        return [
            'code' => ['required', 'string', 'alpha_dash', 'max:50', Rule::unique(Plan::class, 'code')->ignore($planId)],
            'name' => ['required', 'string', 'max:255'],
            'price_month' => ['required', 'integer', 'min:0'],
            'price_year' => ['required', 'integer', 'min:0'],
            'currency' => ['required', 'string', 'size:3'],
            'paystack_plan_code' => ['nullable', 'string', 'max:255'],
            'features' => ['present', 'array'],
            'features.*' => [Rule::enum(Feature::class)],
            'limits' => ['nullable', 'array'],
            'limits.members' => ['nullable', 'integer', 'min:0'],
            'limits.storage_gb' => ['nullable', 'integer', 'min:0'],
            'limits.staff_seats' => ['nullable', 'integer', 'min:0'],
            'limits.domains' => ['nullable', 'integer', 'min:0'],
            'studio_included' => ['boolean'],
            'sort_order' => ['integer', 'min:0'],
            'is_active' => ['boolean'],
        ];
    }
}
