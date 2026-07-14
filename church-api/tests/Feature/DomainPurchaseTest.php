<?php

use App\Contracts\DomainRegistrar;
use App\Models\CentralUser;
use App\Models\Domain;
use App\Models\Tenant;
use App\Services\Registrar\StubRegistrar;
use Illuminate\Support\Facades\Http;

/*
| CHR-207 — super-admin domain purchase: buy a free domain for a church and
| attach it as a verified custom domain. Registrar + RDAP faked (no spend).
*/

function domainBuyerToken(bool $super = true): string
{
    $user = $super ? CentralUser::factory()->create() : CentralUser::factory()->support()->create();

    return $user->createToken('t', ['platform'])->plainTextToken;
}

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
