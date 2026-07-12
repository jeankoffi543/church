<?php

use App\Enums\ProvisioningStatus;
use App\Enums\SubscriptionStatus;
use App\Enums\TenantStatus;
use App\Jobs\ProvisionTenant;
use App\Models\Domain;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\TenantAudit;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Hash;

/*
| CHR-147 / CHR-173 — self-service church signup: records the tenant as
| Provisioning, reserves its subdomain, and hands the database build to the
| async ProvisionTenant job (faked here; run for real in the Tenancy suite).
*/

beforeEach(function () {
    Bus::fake([ProvisionTenant::class]);
    Plan::query()->create(['code' => 'free', 'name' => 'Assemblée', 'features' => [], 'limits' => ['members' => 100], 'is_active' => true]);
});

function signupPayload(array $overrides = []): array
{
    return array_merge([
        'church_name' => 'Grace Chapel',
        'slug' => 'grace-chapel',
        'admin_name' => 'Pasteur Paul',
        'admin_email' => 'paul@grace.test',
        'password' => 'secret123',
        'password_confirmation' => 'secret123',
    ], $overrides);
}

it('signs up a church and queues its provisioning', function () {
    $this->postJson('/api/platform/signup', signupPayload())
        ->assertAccepted()
        ->assertJsonPath('slug', 'grace-chapel')
        ->assertJsonPath('domain', 'grace-chapel.churchapp.io')
        ->assertJsonPath('provisioning_status', 'pending')
        ->assertJsonStructure(['tenant_id', 'slug', 'domain', 'provisioning_status', 'status_url', 'admin_url']);

    $tenant = Tenant::query()->where('slug', 'grace-chapel')->firstOrFail();

    expect($tenant->status)->toBe(TenantStatus::Provisioning)
        ->and($tenant->provisioning_status)->toBe(ProvisioningStatus::Pending)
        ->and($tenant->subscription_status)->toBe(SubscriptionStatus::Trialing)
        ->and($tenant->plan_id)->not->toBeNull()
        ->and(Domain::query()->where('domain', 'grace-chapel.churchapp.io')->exists())->toBeTrue()
        ->and(TenantAudit::query()->where('action', 'signup')->where('tenant_id', $tenant->id)->exists())->toBeTrue();

    // The heavy database build (and first-admin seed) is deferred to the queue.
    Bus::assertDispatched(ProvisionTenant::class, fn (ProvisionTenant $job) => $job->tenant->is($tenant));
});

it('stashes the first-admin credentials hashed for the provisioning job', function () {
    $this->postJson('/api/platform/signup', signupPayload())->assertAccepted();

    $tenant = Tenant::query()->where('slug', 'grace-chapel')->firstOrFail();

    expect($tenant->pending_admin['email'])->toBe('paul@grace.test')
        ->and($tenant->pending_admin['password'])->not->toBe('secret123')
        ->and(Hash::check('secret123', $tenant->pending_admin['password']))->toBeTrue();
});

it('rejects a reserved slug', function () {
    $this->postJson('/api/platform/signup', signupPayload(['slug' => 'admin']))
        ->assertStatus(422)
        ->assertJsonValidationErrorFor('slug');
});

it('rejects a slug already taken', function () {
    Tenant::factory()->create(['slug' => 'taken']);

    $this->postJson('/api/platform/signup', signupPayload(['slug' => 'taken']))
        ->assertStatus(422)
        ->assertJsonValidationErrorFor('slug');
});

it('requires a matching password confirmation', function () {
    $this->postJson('/api/platform/signup', signupPayload(['slug' => 'newchurch', 'password_confirmation' => 'different']))
        ->assertStatus(422)
        ->assertJsonValidationErrorFor('password');
});

/*
| CHR-172 — debounced subdomain availability for the signup wizard.
*/

it('reports a free subdomain as available with its full domain', function () {
    $this->getJson('/api/platform/signup/subdomain?subdomain=grace-chapel')
        ->assertOk()
        ->assertJsonPath('available', true)
        ->assertJsonPath('reason', null)
        ->assertJsonPath('domain', 'grace-chapel.churchapp.io');
});

it('reports a reserved subdomain as unavailable', function () {
    $this->getJson('/api/platform/signup/subdomain?subdomain=admin')
        ->assertOk()
        ->assertJsonPath('available', false)
        ->assertJsonPath('reason', 'reserved')
        ->assertJsonPath('domain', null);
});

it('reports a taken subdomain as unavailable', function () {
    Tenant::factory()->create(['slug' => 'taken']);

    $this->getJson('/api/platform/signup/subdomain?subdomain=taken')
        ->assertOk()
        ->assertJsonPath('available', false)
        ->assertJsonPath('reason', 'taken');
});

it('rejects a malformed subdomain', function (string $subdomain) {
    $this->getJson('/api/platform/signup/subdomain?subdomain='.urlencode($subdomain))
        ->assertOk()
        ->assertJsonPath('available', false)
        ->assertJsonPath('reason', 'invalid');
})->with([
    'too short' => ['ab'],
    'leading hyphen' => ['-bad'],
    'trailing hyphen' => ['bad-'],
    'illegal chars' => ['bad_slug!'],
    'double hyphen edge' => ['a--'],
]);

it('normalises case and whitespace before checking', function () {
    $this->getJson('/api/platform/signup/subdomain?subdomain='.urlencode('  Grace-Chapel  '))
        ->assertOk()
        ->assertJsonPath('subdomain', 'grace-chapel')
        ->assertJsonPath('available', true);
});

it('requires a subdomain query parameter', function () {
    $this->getJson('/api/platform/signup/subdomain')
        ->assertStatus(422)
        ->assertJsonValidationErrorFor('subdomain');
});

/*
| CHR-173 — async provisioning status polling + failure handling.
*/

it('reports a pending provisioning status', function () {
    $tenant = Tenant::factory()->create(['slug' => 'pending-church', 'status' => TenantStatus::Provisioning]);
    $tenant->domains()->create(['domain' => 'pending-church.churchapp.io', 'is_primary' => true]);

    $this->getJson("/api/platform/signup/status/{$tenant->id}")
        ->assertOk()
        ->assertJsonPath('provisioning_status', 'pending')
        ->assertJsonPath('ready', false)
        ->assertJsonPath('failed', false)
        ->assertJsonPath('admin_url', null);
});

it('exposes the admin url once provisioning is ready', function () {
    $tenant = Tenant::factory()->create(['slug' => 'ready-church']);
    $tenant->domains()->create(['domain' => 'ready-church.churchapp.io', 'is_primary' => true]);
    $tenant->markReady();

    $this->getJson("/api/platform/signup/status/{$tenant->id}")
        ->assertOk()
        ->assertJsonPath('provisioning_status', 'ready')
        ->assertJsonPath('ready', true)
        ->assertJsonPath('admin_url', 'https://ready-church.churchapp.io/admins/login');
});

it('surfaces the error when provisioning failed', function () {
    $tenant = Tenant::factory()->create(['slug' => 'broken-church']);
    $tenant->markFailed('Could not reach the database shard');

    $this->getJson("/api/platform/signup/status/{$tenant->id}")
        ->assertOk()
        ->assertJsonPath('provisioning_status', 'failed')
        ->assertJsonPath('failed', true)
        ->assertJsonPath('error', 'Could not reach the database shard');
});

it('marks the tenant failed when the provisioning job fails', function () {
    $tenant = Tenant::factory()->create(['slug' => 'doomed-church']);

    (new ProvisionTenant($tenant))->failed(new RuntimeException('shard offline'));

    expect($tenant->fresh()->provisioning_status)->toBe(ProvisioningStatus::Failed)
        ->and($tenant->fresh()->provisioning_error)->toBe('shard offline');
});
