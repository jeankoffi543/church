<?php

namespace App\Http\Controllers\Api\Platform;

use App\Enums\DomainType;
use App\Enums\SslStatus;
use App\Enums\SubscriptionStatus;
use App\Enums\TenantStatus;
use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\TenantAudit;
use App\Models\User;
use App\Support\AccessControl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

/**
 * Self-service church signup (CHR-147). Public + central: provisions a fresh
 * tenant (DB, migrations, baseline seed via the CHR-135 pipeline), reserves its
 * subdomain, and creates the church's first Super Admin.
 */
class SignupController extends Controller
{
    /** Subdomains reserved for the platform itself. */
    private const RESERVED = ['www', 'app', 'admin', 'admins', 'api', 'central', 'platform', 'mail', 'static', 'assets', 'churchapp'];

    public function signup(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'church_name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'lowercase', 'alpha_dash', 'min:3', 'max:40', Rule::notIn(self::RESERVED), Rule::unique(Tenant::class, 'slug')],
            'admin_name' => ['required', 'string', 'max:255'],
            'admin_email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'plan_code' => ['nullable', 'string', Rule::exists(Plan::class, 'code')],
        ]);

        $plan = Plan::query()->where('is_active', true)
            ->where('code', $validated['plan_code'] ?? 'free')
            ->first()
            ?? Plan::query()->where('code', 'free')->first();

        // Creating the tenant fires the provisioning pipeline (CHR-135): its
        // database is created, migrated and seeded with the baseline (roles,
        // currencies, bible) before we return.
        $tenant = Tenant::create([
            'name' => $validated['church_name'],
            'slug' => $validated['slug'],
            'status' => TenantStatus::Active,
            'plan_id' => $plan?->id,
            'subscription_status' => SubscriptionStatus::Trialing,
            'trial_ends_at' => now()->addDays(14),
        ]);

        $domain = $validated['slug'].'.'.config('tenancy.central_root_domain');

        $tenant->domains()->create([
            'domain' => $domain,
            'type' => DomainType::Subdomain,
            'is_primary' => true,
            'verified_at' => now(),
            'ssl_status' => SslStatus::Issued,
        ]);

        // Create the church's first Super Admin inside its own database.
        $tenant->run(function () use ($validated): void {
            $user = User::create([
                'name' => $validated['admin_name'],
                'email' => $validated['admin_email'],
                'password' => $validated['password'], // hashed by the model cast
                'is_active' => true,
            ]);

            $user->assignRole(Role::findOrCreate(AccessControl::SUPER_ADMIN, 'web'));
        });

        TenantAudit::create([
            'tenant_id' => $tenant->id,
            'action' => 'signup',
            'meta' => ['slug' => $tenant->slug, 'plan' => $plan?->code],
        ]);

        return response()->json([
            'tenant_id' => $tenant->id,
            'slug' => $tenant->slug,
            'domain' => $domain,
            'admin_url' => Str::of("https://{$domain}/admins/login")->toString(),
        ], JsonResponse::HTTP_CREATED);
    }
}
