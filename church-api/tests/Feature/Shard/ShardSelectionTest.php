<?php

use App\Enums\TenantStatus;
use App\Models\DatabaseServer;
use App\Models\Tenant;
use App\Services\ShardSelector;

// CHR-163: a new tenant is placed on a server from the registry at provisioning
// (least-loaded relative to weight), and the server's credentials are written into
// the tenant so stancl creates its database on that shard. An empty registry keeps
// the pre-sharding single-host behaviour.

/** A tenant created the normal way — the CreatingTenant listener runs. */
function bareTenant(): Tenant
{
    $tenant = new Tenant;
    $tenant->name = 'New '.fake()->unique()->numberBetween(1, 9_999_999);
    $tenant->status = TenantStatus::Active;
    $tenant->setInternal('create_database', false);
    $tenant->save();

    return $tenant;
}

/** Pin $count tenants onto $server (pre-placed → the listener skips them). */
function loadShard(DatabaseServer $server, int $count): void
{
    for ($i = 0; $i < $count; $i++) {
        $tenant = new Tenant;
        $tenant->name = 'Loaded '.fake()->unique()->numberBetween(1, 9_999_999);
        $tenant->status = TenantStatus::Active;
        $tenant->database_server_id = $server->id;
        $tenant->setInternal('create_database', false);
        $tenant->save();
    }
}

it('selects nothing when the registry is empty', function () {
    expect(app(ShardSelector::class)->select())->toBeNull();
});

it('ignores inactive and full servers', function () {
    DatabaseServer::factory()->inactive()->create();
    $full = DatabaseServer::factory()->withCapacity(1)->create();
    loadShard($full, 1);

    expect(app(ShardSelector::class)->select())->toBeNull();
});

it('prefers the server least loaded relative to its weight', function () {
    $heavy = DatabaseServer::factory()->create(['name' => 'heavy', 'weight' => 5]);
    $light = DatabaseServer::factory()->create(['name' => 'light', 'weight' => 1]);
    loadShard($heavy, 2); // load 2 / 5 = 0.4
    loadShard($light, 1); // load 1 / 1 = 1.0

    expect(app(ShardSelector::class)->select()->is($heavy))->toBeTrue();
});

it('places a new tenant on a shard and injects its credentials', function () {
    $server = DatabaseServer::factory()->create([
        'connection' => 'mysql',
        'host' => 'db-eu-1',
        'port' => 3306,
        'username' => 'church',
        'password' => 'secret',
    ]);

    $tenant = bareTenant();

    expect($tenant->database_server_id)->toBe($server->id)
        ->and($tenant->getInternal('db_connection'))->toBe('mysql')
        ->and($tenant->getInternal('db_host'))->toBe('db-eu-1')
        ->and((int) $tenant->getInternal('db_port'))->toBe(3306)
        ->and($tenant->getInternal('db_username'))->toBe('church')
        ->and($tenant->getInternal('db_password'))->toBe('secret')
        ->and($server->tenants()->whereKey($tenant->id)->exists())->toBeTrue();
});

it('leaves a tenant on the default connection when the registry is empty', function () {
    $tenant = bareTenant();

    expect($tenant->database_server_id)->toBeNull()
        ->and($tenant->getInternal('db_host'))->toBeNull();
});

it('never reassigns an adopted tenant that already points at a database', function () {
    DatabaseServer::factory()->create(['host' => 'db-shard']);

    $tenant = new Tenant;
    $tenant->name = 'Adopted';
    $tenant->status = TenantStatus::Active;
    $tenant->setInternal('db_name', 'legacy_church_db');
    $tenant->setInternal('create_database', false);
    $tenant->save();

    expect($tenant->database_server_id)->toBeNull()
        ->and($tenant->getInternal('db_host'))->toBeNull()
        ->and($tenant->getInternal('db_name'))->toBe('legacy_church_db');
});
