<?php

use App\Enums\TenantStatus;
use App\Models\CentralUser;
use App\Models\Domain;
use App\Models\Tenant;
use App\Models\TenantAudit;
use App\Models\User;
use App\Support\AccessControl;
use Spatie\Permission\Models\Role;
use Stancl\Tenancy\Events\TenantCreated;
use Stancl\Tenancy\Events\TenantDeleted;

/*
| CHR-139 — the landlord back-office: tenant CRUD, suspend/restore, impersonation
| and the audit trail, all on the `central` guard (super-admins only).
*/

function platformToken(bool $superAdmin = true): string
{
    $user = $superAdmin
        ? CentralUser::factory()->create()
        : CentralUser::factory()->support()->create();

    return $user->createToken('t', ['platform'])->plainTextToken;
}

it('requires a central super-admin', function () {
    // Unauthenticated.
    $this->getJson('/api/platform/tenants')->assertUnauthorized();

    // Authenticated but not a super-admin (support staff).
    $this->withToken(platformToken(superAdmin: false))
        ->getJson('/api/platform/tenants')
        ->assertForbidden();
});

it('lists tenants', function () {
    $this->withToken(platformToken())
        ->getJson('/api/platform/tenants')
        ->assertOk()
        ->assertJsonStructure(['data' => [['id', 'name', 'slug', 'status', 'domains']]]);
});

it('filters tenants by search and status for the console (CHR-183)', function () {
    Event::fake([TenantCreated::class]);
    Tenant::factory()->create(['name' => 'Grace Chapel', 'slug' => 'grace-chapel', 'status' => TenantStatus::Active]);
    Tenant::factory()->create(['name' => 'Hope Center', 'slug' => 'hope-center', 'status' => TenantStatus::Suspended]);

    $token = platformToken();

    $this->withToken($token)->getJson('/api/platform/tenants?search=grace')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.slug', 'grace-chapel');

    $this->withToken($token)->getJson('/api/platform/tenants?status=suspended')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.slug', 'hope-center');
});

it('provisions a tenant on create and audits it', function () {
    Event::fake([TenantCreated::class]); // skip real DB provisioning in this feature test

    $this->withToken(platformToken())
        ->postJson('/api/platform/tenants', [
            'name' => 'New Church',
            'slug' => 'new-church',
            'domain' => 'new-church.churchapp.io',
        ])
        ->assertCreated()
        ->assertJsonPath('data.slug', 'new-church')
        ->assertJsonPath('data.domains.0.domain', 'new-church.churchapp.io');

    expect(Tenant::query()->where('slug', 'new-church')->exists())->toBeTrue()
        ->and(Domain::query()->where('domain', 'new-church.churchapp.io')->exists())->toBeTrue()
        ->and(TenantAudit::query()->where('action', 'created')->exists())->toBeTrue();
});

it('suspends a tenant, which then blocks its church API', function () {
    $tenant = Tenant::query()->firstOrFail(); // the localhost tenant

    $this->withToken(platformToken())
        ->postJson("/api/platform/tenants/{$tenant->id}/suspend")
        ->assertOk()
        ->assertJsonPath('data.status', 'suspended');

    expect(TenantAudit::query()->where('action', 'suspended')->exists())->toBeTrue();

    // CHR-137's guard now turns the church away.
    $this->getJson('http://localhost/api/v1/public/settings')->assertForbidden();
});

it('restores a suspended tenant', function () {
    $tenant = Tenant::query()->firstOrFail();
    $tenant->update(['status' => TenantStatus::Suspended]);

    $this->withToken(platformToken())
        ->postJson("/api/platform/tenants/{$tenant->id}/restore")
        ->assertOk()
        ->assertJsonPath('data.status', 'active');

    $this->getJson('http://localhost/api/v1/public/settings')->assertOk();
});

it('deletes a tenant', function () {
    Event::fake([TenantDeleted::class]); // don't try to drop a database in this feature test

    $tenant = Tenant::query()->firstOrFail();

    $this->withToken(platformToken())
        ->deleteJson("/api/platform/tenants/{$tenant->id}")
        ->assertOk();

    expect(Tenant::query()->whereKey($tenant->id)->exists())->toBeFalse()
        ->and(TenantAudit::query()->where('action', 'deleted')->exists())->toBeTrue();
});

it('impersonates a church admin with a short-lived, working token', function () {
    $admin = User::factory()->create();
    $admin->assignRole(Role::findOrCreate(AccessControl::SUPER_ADMIN, 'web'));

    $tenant = Tenant::query()->firstOrFail();

    $response = $this->withToken(platformToken())
        ->postJson("/api/platform/tenants/{$tenant->id}/impersonate")
        ->assertOk()
        ->assertJsonStructure(['token', 'expires_at', 'impersonated_user' => ['id', 'email']]);

    expect(TenantAudit::query()->where('action', 'impersonated')->where('tenant_id', $tenant->id)->exists())->toBeTrue();

    // The minted token drives the tenant's admin API.
    $this->withToken($response->json('token'))
        ->getJson('http://localhost/api/v1/admin/me')
        ->assertOk()
        ->assertJsonPath('data.id', $admin->id);
});
