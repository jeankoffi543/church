<?php

namespace App\Http\Controllers\Api\Platform;

use App\Enums\DomainStatus;
use App\Enums\DomainType;
use App\Enums\SslStatus;
use App\Enums\TenantStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\TenantResource;
use App\Models\CentralUser;
use App\Models\Domain;
use App\Models\Tenant;
use App\Models\TenantAudit;
use App\Models\User;
use App\Support\AccessControl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/**
 * Landlord back-office for churches (tenants). Runs on the `central` guard, in
 * central context. Every mutating action is written to the {@see TenantAudit}
 * trail (CHR-139).
 */
class TenantController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $tenants = Tenant::query()
            ->with('domains')
            ->when($request->filled('search'), function ($query) use ($request): void {
                $term = trim((string) $request->string('search'));
                $query->where(fn ($q) => $q->where('name', 'like', "%{$term}%")->orWhere('slug', 'like', "%{$term}%"));
            })
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
            ->latest()
            ->paginate(20)
            ->withQueryString();

        return TenantResource::collection($tenants);
    }

    public function show(Tenant $tenant): TenantResource
    {
        return new TenantResource($tenant->load('domains'));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'alpha_dash', 'max:255', Rule::unique(Tenant::class, 'slug')],
            'domain' => ['required', 'string', 'max:255', Rule::unique(Domain::class, 'domain')],
            'domain_type' => ['nullable', Rule::enum(DomainType::class)],
            'studio_enabled' => ['boolean'],
            'studio_seats' => ['integer', 'min:0'],
        ]);

        $type = DomainType::tryFrom($validated['domain_type'] ?? '') ?? DomainType::Subdomain;

        // Creating the tenant fires TenantCreated → provisions its database,
        // migrates and seeds the baseline (CHR-135).
        $tenant = Tenant::create([
            'name' => $validated['name'],
            'slug' => $validated['slug'],
            'status' => TenantStatus::Active,
            'studio_enabled' => $validated['studio_enabled'] ?? false,
            'studio_seats' => $validated['studio_seats'] ?? 0,
        ]);

        $tenant->domains()->create([
            'domain' => strtolower($validated['domain']),
            'type' => $type,
            'is_primary' => true,
            'status' => $type === DomainType::Subdomain ? DomainStatus::Active : DomainStatus::Pending,
            'verified_at' => $type === DomainType::Subdomain ? now() : null,
            'ssl_status' => $type === DomainType::Subdomain ? SslStatus::Issued : SslStatus::Pending,
        ]);

        $this->audit($request->user(), $tenant->id, 'created', ['slug' => $tenant->slug]);

        return (new TenantResource($tenant->load('domains')))
            ->response()
            ->setStatusCode(JsonResponse::HTTP_CREATED);
    }

    public function update(Request $request, Tenant $tenant): TenantResource
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'studio_enabled' => ['sometimes', 'boolean'],
            'studio_seats' => ['sometimes', 'integer', 'min:0'],
        ]);

        $tenant->update($validated);

        $this->audit($request->user(), $tenant->id, 'updated', $validated);

        return new TenantResource($tenant->load('domains'));
    }

    public function destroy(Request $request, Tenant $tenant): JsonResponse
    {
        $this->audit($request->user(), $tenant->id, 'deleted', ['slug' => $tenant->slug]);

        // Firing TenantDeleted drops the tenant database (CHR-135).
        $tenant->delete();

        return response()->json(['message' => 'Église supprimée.']);
    }

    public function suspend(Request $request, Tenant $tenant): TenantResource
    {
        $tenant->update(['status' => TenantStatus::Suspended]);

        $this->audit($request->user(), $tenant->id, 'suspended');

        return new TenantResource($tenant->load('domains'));
    }

    public function restore(Request $request, Tenant $tenant): TenantResource
    {
        $tenant->update(['status' => TenantStatus::Active]);

        $this->audit($request->user(), $tenant->id, 'restored');

        return new TenantResource($tenant->load('domains'));
    }

    /**
     * Enter a tenant for support: mint a short-lived token for the church's
     * Super Admin so the platform staff can drive its admin API. Audited.
     */
    public function impersonate(Request $request, Tenant $tenant): JsonResponse
    {
        $token = null;
        $impersonated = null;
        $expiresAt = now()->addMinutes(30);

        $tenant->run(function () use (&$token, &$impersonated, $expiresAt): void {
            // whereHas (not the Spatie role() scope) so an absent role doesn't throw.
            $user = User::query()->whereHas('roles', fn ($q) => $q->where('name', AccessControl::SUPER_ADMIN))->first()
                ?? User::query()->first();

            abort_if($user === null, JsonResponse::HTTP_UNPROCESSABLE_ENTITY, "Cette église n'a aucun administrateur à incarner.");

            $impersonated = ['id' => $user->id, 'name' => $user->name, 'email' => $user->email];
            $token = $user->createToken('platform-impersonation', ['admin', 'impersonation'], $expiresAt)->plainTextToken;
        });

        $this->audit($request->user(), $tenant->id, 'impersonated', ['user' => $impersonated]);

        return response()->json([
            'token' => $token,
            'expires_at' => $expiresAt->toIso8601String(),
            'tenant' => [
                'id' => $tenant->id,
                'domain' => $tenant->domains()->where('is_primary', true)->value('domain'),
            ],
            'impersonated_user' => $impersonated,
        ]);
    }

    private function audit(?CentralUser $actor, ?string $tenantId, string $action, array $meta = []): void
    {
        TenantAudit::create([
            'central_user_id' => $actor?->id,
            'tenant_id' => $tenantId,
            'action' => $action,
            'meta' => $meta === [] ? null : $meta,
        ]);
    }
}
