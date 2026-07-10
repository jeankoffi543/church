<?php

use App\Models\Tenant;
use App\Providers\TenancyServiceProvider;
use Stancl\Tenancy\Bootstrappers\CacheTenancyBootstrapper;
use Stancl\Tenancy\Bootstrappers\DatabaseTenancyBootstrapper;
use Stancl\Tenancy\Bootstrappers\FilesystemTenancyBootstrapper;
use Stancl\Tenancy\Bootstrappers\QueueTenancyBootstrapper;
use Stancl\Tenancy\Contracts\TenantWithDatabase;
use Stancl\Tenancy\Database\Concerns\HasDatabase;
use Stancl\Tenancy\Database\Concerns\HasDomains;

/*
| CHR-133 — locks in the stancl/tenancy foundation wiring. These assertions are
| hermetic (no tenant DBs are provisioned): they guard against a regression that
| silently unwires multi-database tenancy. Real provisioning/isolation tests
| arrive with the provisioning pipeline (CHR-135) and hardening (CHR-151).
*/

it('registers the tenancy service provider', function () {
    expect(app()->getProviders(TenancyServiceProvider::class))->not->toBeEmpty();
});

it('uses a tenant model that owns a physical database', function () {
    expect(new Tenant)->toBeInstanceOf(TenantWithDatabase::class)
        ->and(class_uses_recursive(Tenant::class))
        ->toContain(HasDatabase::class, HasDomains::class)
        ->and(config('tenancy.tenant_model'))->toBe(Tenant::class);
});

it('points the central connection at its own landlord database', function () {
    expect(config('tenancy.database.central_connection'))->toBe('central')
        ->and(config('database.connections.central'))->toBeArray()
        ->and(config('database.connections.central'))->toHaveKey('driver')
        // Central must stay decoupled from the default (legacy/tenant-destined) data.
        ->and(config('database.connections.central'))->not->toBe(config('database.connections.'.config('database.default')));
});

it('enables the database, cache, filesystem and queue bootstrappers', function () {
    expect(config('tenancy.bootstrappers'))->toContain(
        DatabaseTenancyBootstrapper::class,
        CacheTenancyBootstrapper::class,
        FilesystemTenancyBootstrapper::class,
        QueueTenancyBootstrapper::class,
    );
});

it('splits central and tenant migrations into dedicated folders', function () {
    expect(glob(database_path('migrations/central/*_create_tenants_table.php')))->not->toBeEmpty()
        ->and(glob(database_path('migrations/central/*_create_domains_table.php')))->not->toBeEmpty()
        ->and(is_dir(database_path('migrations/tenant')))->toBeTrue();
});
