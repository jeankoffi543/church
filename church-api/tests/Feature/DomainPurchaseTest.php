<?php

use App\Contracts\DomainRegistrar;
use App\Enums\DomainType;
use App\Models\CentralUser;
use App\Models\Domain;
use App\Models\Plan;
use App\Models\Tenant;
use App\Services\Registrar\StubRegistrar;
use Illuminate\Support\Facades\Http;

/*
| CHR-207 / CHR-209 — super-admin domain purchase: buy a free domain for a church
| and attach it as a verified custom domain, within the plan's domain quota.
| Registrar + RDAP faked (no spend).
*/

function domainBuyerToken(bool $super = true): string
{
    $user = $super ? CentralUser::factory()->create() : CentralUser::factory()->support()->create();

    return $user->createToken('t', ['platform'])->plainTextToken;
}

/** Put the tenant on a plan whose domain allowance is $quota (null = unlimited). */
function giveTenantDomainQuota(Tenant $tenant, ?int $quota): void
{
    $plan = Plan::query()->create([
        'code' => 'test-'.uniqid(),
        'name' => 'Test plan',
        'features' => [],
        'limits' => ['domains' => $quota],
    ]);

    $tenant->forceFill(['plan_id' => $plan->id])->save();
}

beforeEach(function () {
    // Most tests need to get past the quota gate — give an unlimited plan.
    giveTenantDomainQuota(Tenant::first(), null);
});

it('requires a central super-admin', function () {
    $tenant = Tenant::first();

    $this->postJson("/api/platform/tenants/{$tenant->id}/domain/purchase", ['domain' => 'grace-parish.org'])
        ->assertUnauthorized();

    $this->withToken(domainBuyerToken(super: false))
        ->postJson("/api/platform/tenants/{$tenant->id}/domain/purchase", ['domain' => 'grace-parish.org'])
        ->assertForbidden();
});

it('buys a free domain and attaches it as a verified custom domain', function () {
    $this->app->instance(DomainRegistrar::class, new StubRegistrar('USD'));
    Http::fake(['*rdap.org*' => Http::response('', 404)]); // RDAP: free
    $tenant = Tenant::first();

    $this->withToken(domainBuyerToken())
        ->postJson("/api/platform/tenants/{$tenant->id}/domain/purchase", ['domain' => 'grace-parish.org', 'years' => 2])
        ->assertCreated()
        ->assertJsonPath('data.domain', 'grace-parish.org')
        ->assertJsonPath('data.status', 'verified')
        ->assertJsonPath('data.reference', 'stub-order-grace-parish.org');

    $domain = Domain::query()->where('domain', 'grace-parish.org')->first();
    expect($domain)->not->toBeNull()
        ->and($domain->tenant_id)->toBe($tenant->id)
        ->and($domain->is_primary)->toBeFalse();
});

it('refuses to buy when the plan includes no domain (quota 0)', function () {
    $this->app->instance(DomainRegistrar::class, new StubRegistrar('USD'));
    Http::fake(['*rdap.org*' => Http::response('', 404)]);
    $tenant = Tenant::first();
    giveTenantDomainQuota($tenant, 0);

    $this->withToken(domainBuyerToken())
        ->postJson("/api/platform/tenants/{$tenant->id}/domain/purchase", ['domain' => 'no-quota.org'])
        ->assertStatus(403);

    expect(Domain::query()->where('domain', 'no-quota.org')->exists())->toBeFalse();
    Http::assertNothingSent(); // the quota gate short-circuits before RDAP
});

it('counts existing custom domains against the plan quota', function () {
    $this->app->instance(DomainRegistrar::class, new StubRegistrar('USD'));
    Http::fake(['*rdap.org*' => Http::response('', 404)]);
    $tenant = Tenant::first();
    giveTenantDomainQuota($tenant, 1);
    $tenant->domains()->create(['domain' => 'first-custom.org', 'type' => DomainType::Custom]); // quota used

    $this->withToken(domainBuyerToken())
        ->postJson("/api/platform/tenants/{$tenant->id}/domain/purchase", ['domain' => 'second-custom.org'])
        ->assertStatus(403);
});

it('refuses to buy a domain that is not available', function () {
    $this->app->instance(DomainRegistrar::class, new StubRegistrar('USD'));
    Http::fake(['*rdap.org*' => Http::response(['ldhName' => 'x'], 200)]); // RDAP: taken
    $tenant = Tenant::first();

    $this->withToken(domainBuyerToken())
        ->postJson("/api/platform/tenants/{$tenant->id}/domain/purchase", ['domain' => 'already-taken.org'])
        ->assertStatus(422);

    expect(Domain::query()->where('domain', 'already-taken.org')->exists())->toBeFalse();
});

it('returns 502 and creates nothing when the registrar cannot buy (default null driver)', function () {
    Http::fake(['*rdap.org*' => Http::response('', 404)]); // free per RDAP, but no registrar
    $tenant = Tenant::first();

    $this->withToken(domainBuyerToken())
        ->postJson("/api/platform/tenants/{$tenant->id}/domain/purchase", ['domain' => 'free-but-unbuyable.org'])
        ->assertStatus(502);

    expect(Domain::query()->where('domain', 'free-but-unbuyable.org')->exists())->toBeFalse();
});
