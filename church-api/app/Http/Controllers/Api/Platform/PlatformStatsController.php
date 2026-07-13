<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Platform;

use App\Enums\SubscriptionStatus;
use App\Enums\TenantStatus;
use App\Http\Controllers\Controller;
use App\Models\DatabaseServer;
use App\Models\Plan;
use App\Models\PushSubscription;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\TenantAudit;
use Illuminate\Http\JsonResponse;

/**
 * Read-only platform health & business metrics for the super-admin console
 * (CHR-184): tenant/revenue overview, database-shard capacity, the landlord
 * audit trail and the push registry size. Super-admins only (route group).
 */
class PlatformStatsController extends Controller
{
    public function overview(): JsonResponse
    {
        $activeSubscriptions = Subscription::query()
            ->where('status', SubscriptionStatus::Active)
            ->with('plan')
            ->get();

        $mrr = $activeSubscriptions->sum(fn (Subscription $s): int => (int) ($s->plan?->price_month ?? 0));
        $currency = $activeSubscriptions->first()?->plan?->currency ?? 'USD';

        return response()->json(['data' => [
            'tenants' => [
                'total' => Tenant::query()->count(),
                'active' => Tenant::query()->where('status', TenantStatus::Active)->count(),
                'suspended' => Tenant::query()->where('status', TenantStatus::Suspended)->count(),
                'provisioning' => Tenant::query()->where('status', TenantStatus::Provisioning)->count(),
            ],
            'revenue' => [
                'mrr' => $mrr,
                'currency' => $currency,
                'active_subscriptions' => $activeSubscriptions->count(),
            ],
            'plans' => Plan::query()->orderBy('sort_order')->get()->map(fn (Plan $plan): array => [
                'code' => $plan->code,
                'name' => $plan->name,
                'price_month' => (int) $plan->price_month,
                'tenants' => Tenant::query()->where('plan_id', $plan->id)->count(),
            ])->all(),
            'push' => [
                'subscriptions' => PushSubscription::query()->count(),
            ],
        ]]);
    }

    public function shards(): JsonResponse
    {
        $servers = DatabaseServer::query()->withCount('tenants')->orderBy('name')->get()
            ->map(fn (DatabaseServer $server): array => [
                'id' => $server->id,
                'name' => $server->name,
                'host' => $server->host,
                'is_active' => (bool) $server->is_active,
                'max_tenants' => $server->max_tenants,
                'tenants_count' => $server->tenants_count,
                'weight' => $server->weight,
                'has_read_replica' => $server->read_host !== null,
            ]);

        return response()->json(['data' => [
            'servers' => $servers,
            // Tenants still on the implicit default connection (no shard assigned).
            'unassigned' => Tenant::query()->whereNull('database_server_id')->count(),
        ]]);
    }

    public function audits(): JsonResponse
    {
        $audits = TenantAudit::query()
            ->with(['actor', 'tenant'])
            ->latest('created_at')
            ->paginate(30);

        $mapped = $audits->through(fn (TenantAudit $audit): array => [
            'id' => $audit->id,
            'action' => $audit->action,
            'actor' => $audit->actor ? ['name' => $audit->actor->name, 'email' => $audit->actor->email] : null,
            'tenant' => $audit->tenant ? ['id' => $audit->tenant->id, 'name' => $audit->tenant->name, 'slug' => $audit->tenant->slug] : null,
            'meta' => $audit->meta,
            'created_at' => $audit->created_at?->toIso8601String(),
        ]);

        return response()->json([
            'data' => $mapped->items(),
            'meta' => [
                'current_page' => $mapped->currentPage(),
                'last_page' => $mapped->lastPage(),
                'total' => $mapped->total(),
                'per_page' => $mapped->perPage(),
            ],
        ]);
    }
}
