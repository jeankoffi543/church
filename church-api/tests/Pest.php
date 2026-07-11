<?php

use App\Enums\DomainType;
use App\Enums\Feature;
use App\Enums\TenantStatus;
use App\Models\Tenant;
use App\Models\User;
use App\Support\AccessControl;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->beforeEach(function () {
        // The church API is served in tenant context (resolved by domain). In
        // tests the tenant shares the seeded default connection: central lives
        // on it and tenancy is context-only (no DB/cache/filesystem switch), so
        // every existing feature test runs against a `localhost` tenant without
        // change. The real infra switching is covered by the Tenancy suite.
        config([
            'tenancy.database.central_connection' => config('database.default'),
            'tenancy.bootstrappers' => [],
        ]);

        $tenant = new Tenant;
        $tenant->name = 'Test Church';
        $tenant->status = TenantStatus::Active;
        // Enable every feature by default so existing feature tests aren't gated;
        // tests that assert gating override this on their own tenant.
        $tenant->features = array_fill_keys(Feature::values(), true);
        $tenant->setInternal('create_database', false);
        $tenant->save();

        $tenant->domains()->create([
            'domain' => 'localhost',
            'type' => DomainType::Subdomain,
            'is_primary' => true,
        ]);
    })
    ->in('Feature');

// Tenancy provisioning tests spin up real tenant databases and run migrations,
// which conflicts with RefreshDatabase's transaction on the default connection.
// They manage (and tear down) their own central + tenant databases instead.
pest()->extend(TestCase::class)->in('Tenancy');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

function something()
{
    // ..
}

/**
 * Create a user holding the given permissions (created on the fly) and
 * authenticate them through Sanctum. Returns the user.
 *
 * @param  list<string>  $permissions
 */
function actingAsAdminWith(array $permissions = []): User
{
    $user = User::factory()->create();

    foreach ($permissions as $permission) {
        Permission::findOrCreate($permission, 'web');
    }

    $user->givePermissionTo($permissions);

    Sanctum::actingAs($user);

    return $user;
}

/**
 * Create and authenticate a Super Admin. Thanks to the Gate::before hook this
 * user passes every permission check without explicit grants.
 */
function actingAsSuperAdmin(): User
{
    $user = User::factory()->create();
    $role = Role::findOrCreate(AccessControl::SUPER_ADMIN, 'web');
    $user->assignRole($role);

    Sanctum::actingAs($user);

    return $user;
}
