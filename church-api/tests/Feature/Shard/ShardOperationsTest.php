<?php

use App\Enums\TenantStatus;
use App\Models\DatabaseServer;
use App\Models\Tenant;

// CHR-164: moving a tenant between shards, read/write-split when a server has a
// read replica, and per-shard backups.

/** A saved tenant already placed on $server (pre-pinned → the CHR-163 listener skips it). */
function tenantOnServer(DatabaseServer $server): Tenant
{
    $tenant = new Tenant;
    $tenant->name = 'Church '.fake()->unique()->numberBetween(1, 9_999_999);
    $tenant->status = TenantStatus::Active;
    $server->applyTo($tenant);
    $tenant->setInternal('create_database', false);
    $tenant->save();

    return $tenant;
}

it('re-points a tenant at the target server when moved', function () {
    $a = DatabaseServer::factory()->create(['name' => 'shard-a', 'host' => 'db-a']);
    $b = DatabaseServer::factory()->create(['name' => 'shard-b', 'host' => 'db-b', 'connection' => 'mysql', 'username' => 'ub', 'password' => 'pb']);
    $tenant = tenantOnServer($a);

    expect($tenant->database_server_id)->toBe($a->id);

    $this->artisan('tenants:move-shard', ['tenant' => $tenant->id, '--to' => 'shard-b', '--force' => true])
        ->assertSuccessful();

    $tenant->refresh();
    expect($tenant->database_server_id)->toBe($b->id)
        ->and($tenant->getInternal('db_host'))->toBe('db-b')
        ->and($tenant->getInternal('db_connection'))->toBe('mysql')
        ->and($tenant->getInternal('db_username'))->toBe('ub');
});

it('refuses to move to an unknown or unavailable server', function () {
    $tenant = tenantOnServer(DatabaseServer::factory()->create(['name' => 'home']));

    $this->artisan('tenants:move-shard', ['tenant' => $tenant->id, '--to' => 'nope'])->assertFailed();

    DatabaseServer::factory()->inactive()->create(['name' => 'off']);
    $this->artisan('tenants:move-shard', ['tenant' => $tenant->id, '--to' => 'off'])->assertFailed();

    // …but --force overrides the availability check.
    $this->artisan('tenants:move-shard', ['tenant' => $tenant->id, '--to' => 'off', '--force' => true])->assertSuccessful();
});

it('gives a tenant a read/write-split connection when the server has a replica', function () {
    $server = DatabaseServer::factory()->withReadReplica('replica-1')->create(['host' => 'primary-1']);
    $tenant = tenantOnServer($server);

    expect($tenant->getInternal('db_read'))->toEqual(['host' => ['replica-1']])
        ->and($tenant->getInternal('db_write'))->toEqual(['host' => ['primary-1']])
        ->and($tenant->getInternal('db_sticky'))->toBeTrue();
});

it('leaves the connection single-host when the server has no replica', function () {
    $tenant = tenantOnServer(DatabaseServer::factory()->create(['read_host' => null]));

    expect($tenant->getInternal('db_read'))->toBeNull();
});

it('backs up only the tenants on the requested shard', function () {
    $a = DatabaseServer::factory()->create(['name' => 'shard-a']);
    $b = DatabaseServer::factory()->create(['name' => 'shard-b']);
    $onA = tenantOnServer($a);
    $onB = tenantOnServer($b);

    $this->artisan('tenants:backup', ['--server' => 'shard-a'])
        ->expectsOutputToContain($onA->id)
        ->doesntExpectOutputToContain($onB->id)
        ->assertSuccessful();

    $this->artisan('tenants:backup', ['--server' => 'unknown'])->assertFailed();
});
