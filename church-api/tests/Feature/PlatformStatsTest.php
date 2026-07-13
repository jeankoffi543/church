<?php

use App\Enums\SubscriptionStatus;
use App\Enums\TenantStatus;
use App\Models\CentralUser;
use App\Models\DatabaseServer;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\TenantAudit;
use Stancl\Tenancy\Events\TenantCreated;

/*
| CHR-184 — read-only platform health & business metrics for the super-admin
| console: tenant/revenue overview, database-shard capacity and the audit trail.
*/

function statsSuperToken(bool $super = true): string
{
    $user = $super ? CentralUser::factory()->create() : CentralUser::factory()->support()->create();

    return $user->createToken('t', ['platform'])->plainTextToken;
}

it('gates the metrics behind a central super-admin', function () {
    test()->getJson('/api/platform/stats/overview')->assertUnauthorized();

    test()->withToken(statsSuperToken(super: false))
        ->getJson('/api/platform/stats/overview')
        ->assertForbidden();
});

it('reports the tenant + revenue overview', function () {
    Event::fake([TenantCreated::class]);
    $plan = Plan::query()->create(['code' => 'growth', 'name' => 'Diocèse', 'features' => [], 'limits' => [], 'price_month' => 4900, 'currency' => 'USD', 'is_active' => true]);
    $tenant = Tenant::factory()->create(['plan_id' => $plan->id, 'status' => TenantStatus::Active]);
    Subscription::query()->create(['tenant_id' => $tenant->id, 'plan_id' => $plan->id, 'status' => SubscriptionStatus::Active]);

    test()->withToken(statsSuperToken())
        ->getJson('/api/platform/stats/overview')
        ->assertOk()
        ->assertJsonPath('data.revenue.mrr', 4900)
        ->assertJsonPath('data.revenue.currency', 'USD')
        ->assertJsonPath('data.revenue.active_subscriptions', 1)
        ->assertJsonStructure(['data' => [
            'tenants' => ['total', 'active', 'suspended', 'provisioning'],
            'revenue' => ['mrr', 'currency', 'active_subscriptions'],
            'plans',
            'push' => ['subscriptions'],
        ]]);
});

it('lists database shards with their tenant counts', function () {
    Event::fake([TenantCreated::class]);
    $server = DatabaseServer::factory()->create(['name' => 'primary']);
    Tenant::factory()->create(['database_server_id' => $server->id]);

    test()->withToken(statsSuperToken())
        ->getJson('/api/platform/stats/shards')
        ->assertOk()
        ->assertJsonPath('data.servers.0.name', 'primary')
        ->assertJsonPath('data.servers.0.tenants_count', 1)
        ->assertJsonStructure(['data' => ['servers' => [['id', 'name', 'host', 'is_active', 'tenants_count', 'has_read_replica']], 'unassigned']]);
});

it('lists the audit trail with actor and church', function () {
    Event::fake([TenantCreated::class]);
    $actor = CentralUser::factory()->create();
    $tenant = Tenant::factory()->create();
    TenantAudit::create(['central_user_id' => $actor->id, 'tenant_id' => $tenant->id, 'action' => 'suspended', 'meta' => ['reason' => 'test']]);

    test()->withToken(statsSuperToken())
        ->getJson('/api/platform/stats/audits')
        ->assertOk()
        ->assertJsonPath('data.0.action', 'suspended')
        ->assertJsonPath('data.0.tenant.id', $tenant->id)
        ->assertJsonPath('data.0.actor.email', $actor->email)
        ->assertJsonStructure(['data' => [['id', 'action', 'actor', 'tenant', 'meta', 'created_at']], 'meta' => ['current_page', 'last_page', 'total', 'per_page']]);
});
