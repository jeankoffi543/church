<?php

namespace App\Http\Controllers\Api\Platform;

use App\Enums\DomainStatus;
use App\Enums\DomainType;
use App\Enums\ProvisioningStatus;
use App\Enums\SslStatus;
use App\Enums\SubscriptionStatus;
use App\Enums\TenantStatus;
use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\TenantAudit;
use App\Services\PaystackBillingService;
use App\Services\Signup\SubdomainAvailability;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Self-service church signup (CHR-147, async provisioning CHR-173). Public +
 * central: reserves the subdomain, records the tenant, and hands the heavy
 * database build (create + migrate + seed baseline + first admin) to the
 * ProvisionTenant job. Returns 202 with a status URL the wizard polls until the
 * church is ready.
 */
class SignupController extends Controller
{
    public function __construct(private readonly SubdomainAvailability $availability) {}

    /** Debounced availability check for the signup wizard (CHR-172). */
    public function checkSubdomain(Request $request): JsonResponse
    {
        $request->validate([
            'subdomain' => ['required', 'string', 'max:60'],
        ]);

        $subdomain = strtolower(trim((string) $request->query('subdomain')));
        $result = $this->availability->check($subdomain);

        return response()->json([
            'subdomain' => $subdomain,
            'available' => $result['available'],
            'reason' => $result['reason'],
            'domain' => $result['available']
                ? $subdomain.'.'.config('tenancy.central_root_domain')
                : null,
        ]);
    }

    public function signup(Request $request, PaystackBillingService $billing): JsonResponse
    {
        $validated = $request->validate([
            'church_name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'lowercase', 'alpha_dash', 'min:3', 'max:40'],
            'admin_name' => ['required', 'string', 'max:255'],
            'admin_email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'plan_code' => ['nullable', 'string', Rule::exists(Plan::class, 'code')],
            'callback_url' => ['nullable', 'url', 'max:2048'],
        ]);

        // Reserve the subdomain through the shared service so uniqueness hits the
        // central connection (a `unique` rule would query the tenant/default DB).
        $availability = $this->availability->check($validated['slug']);

        if (! $availability['available']) {
            throw ValidationException::withMessages([
                'slug' => [match ($availability['reason']) {
                    'reserved' => 'Ce sous-domaine est réservé.',
                    'taken' => 'Ce sous-domaine est déjà pris.',
                    default => 'Ce sous-domaine est invalide.',
                }],
            ]);
        }

        $plan = Plan::query()->where('is_active', true)
            ->where('code', $validated['plan_code'] ?? 'free')
            ->first()
            ?? Plan::query()->where('code', 'free')->first();

        // A paid plan holds provisioning until Paystack confirms the charge
        // (CHR-175); a free plan builds immediately.
        $paid = (int) ($plan?->price_month ?? 0) > 0;

        // Record the tenant; creating a free tenant fires the ProvisionTenant job
        // (CHR-173) which builds the database off the request and seeds the first
        // admin from the credentials stashed here (cleared once used). A paid
        // tenant starts AwaitingPayment, so that listener stands down until billing
        // releases it.
        $tenant = Tenant::create([
            'name' => $validated['church_name'],
            'slug' => $validated['slug'],
            'status' => TenantStatus::Provisioning,
            'provisioning_status' => $paid ? ProvisioningStatus::AwaitingPayment : ProvisioningStatus::Pending,
            'plan_id' => $plan?->id,
            'subscription_status' => SubscriptionStatus::Trialing,
            'trial_ends_at' => now()->addDays(14),
            'pending_admin' => [
                'name' => $validated['admin_name'],
                'email' => $validated['admin_email'],
                'password' => Hash::make($validated['password']),
            ],
        ]);

        $domain = $validated['slug'].'.'.config('tenancy.central_root_domain');

        $tenant->domains()->create([
            'domain' => $domain,
            'type' => DomainType::Subdomain,
            'is_primary' => true,
            'status' => DomainStatus::Active,
            'verified_at' => now(),
            'ssl_status' => SslStatus::Issued,
        ]);

        TenantAudit::create([
            'tenant_id' => $tenant->id,
            'action' => 'signup',
            'meta' => ['slug' => $tenant->slug, 'plan' => $plan?->code],
        ]);

        // For a paid plan, open a Paystack checkout the wizard redirects to; the
        // payer returns to $callbackUrl (tenant id appended) where verifyPayment()
        // confirms the charge and releases provisioning.
        $checkoutUrl = null;

        if ($paid && $plan !== null) {
            $base = $validated['callback_url'] ?? null;
            $callbackUrl = $base !== null
                ? $base.(str_contains($base, '?') ? '&' : '?').'tenant='.$tenant->id
                : null;

            $checkoutUrl = $billing->initialize($tenant, $plan, $validated['admin_email'], $callbackUrl)->authorization_url;
        }

        return response()->json([
            'tenant_id' => $tenant->id,
            'slug' => $tenant->slug,
            'domain' => $domain,
            'provisioning_status' => $tenant->provisioning_status->value,
            'payment_required' => $paid,
            'checkout_url' => $checkoutUrl,
            'status_url' => route('api.platform.signup.status', ['tenant' => $tenant->id]),
            'admin_url' => Str::of("https://{$domain}/admins/login")->toString(),
        ], JsonResponse::HTTP_ACCEPTED);
    }

    /**
     * Confirm a paid signup's checkout on the Paystack return (CHR-175). Verifying
     * the reference server-side releases provisioning without waiting on the
     * webhook; the wizard then polls {@see status()} until the church is ready.
     */
    public function verifyPayment(Request $request, Tenant $tenant, PaystackBillingService $billing): JsonResponse
    {
        $request->validate([
            'reference' => ['required', 'string', 'max:255'],
        ]);

        $billing->verify((string) $request->input('reference'));

        return $this->status($tenant->fresh());
    }

    /**
     * Provisioning status for the signup wizard's poller (CHR-173). Keyed by the
     * tenant's opaque id, so it is safe to expose without auth.
     */
    public function status(Tenant $tenant): JsonResponse
    {
        $provisioning = $tenant->provisioning_status ?? ProvisioningStatus::Pending;
        $domain = $tenant->domains()->where('is_primary', true)->value('domain');

        return response()->json([
            'tenant_id' => $tenant->id,
            'slug' => $tenant->slug,
            'provisioning_status' => $provisioning->value,
            'ready' => $provisioning->isReady(),
            'failed' => $provisioning === ProvisioningStatus::Failed,
            'error' => $provisioning === ProvisioningStatus::Failed ? $tenant->provisioning_error : null,
            'admin_url' => $provisioning->isReady() && $domain !== null
                ? "https://{$domain}/admins/login"
                : null,
        ]);
    }
}
