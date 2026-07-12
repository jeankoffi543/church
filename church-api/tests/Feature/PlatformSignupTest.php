<?php

use App\Enums\SubscriptionStatus;
use App\Models\Domain;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\TenantAudit;
use App\Models\User;
use App\Support\AccessControl;
use Stancl\Tenancy\Events\TenantCreated;

/*
| CHR-147 — self-service church signup: creates the tenant (provisioning faked
| here — covered for real by the CHR-135 suite), reserves its subdomain and
| provisions the first Super Admin.
*/

beforeEach(function () {
    Event::fake([TenantCreated::class]);
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

it('signs up a church and provisions its super-admin', function () {
    $this->postJson('/api/platform/signup', signupPayload())
        ->assertCreated()
        ->assertJsonPath('slug', 'grace-chapel')
        ->assertJsonPath('domain', 'grace-chapel.churchapp.io')
        ->assertJsonStructure(['tenant_id', 'slug', 'domain', 'admin_url']);

    $tenant = Tenant::query()->where('slug', 'grace-chapel')->firstOrFail();

    expect($tenant->subscription_status)->toBe(SubscriptionStatus::Trialing)
        ->and($tenant->plan_id)->not->toBeNull()
        ->and(Domain::query()->where('domain', 'grace-chapel.churchapp.io')->exists())->toBeTrue()
        ->and(TenantAudit::query()->where('action', 'signup')->where('tenant_id', $tenant->id)->exists())->toBeTrue();

    // The Super Admin lives inside the tenant's own database.
    $tenant->run(function () {
        $admin = User::query()->where('email', 'paul@grace.test')->first();
        expect($admin)->not->toBeNull()
            ->and($admin->hasRole(AccessControl::SUPER_ADMIN))->toBeTrue();
    });
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
