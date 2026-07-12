<?php

use App\Enums\TenantStatus;
use App\Models\DatabaseServer;
use App\Models\Tenant;

// CHR-162: the central registry of database servers (shards) tenants can live on
// — the source the provisioner picks from (CHR-163) and rebalances across (CHR-164).

/** A saved tenant on the given server (no real DB provisioned). */
function makeShardTenant(?DatabaseServer $server = null): Tenant
{
    $tenant = new Tenant;
    $tenant->name = 'Church '.fake()->unique()->numberBetween(1, 99999);
    $tenant->status = TenantStatus::Active;

    if ($server !== null) {
        $tenant->database_server_id = $server->id;
    }

    $tenant->setInternal('create_database', false);
    $tenant->save();

    return $tenant;
}

it('links a tenant to its database server both ways', function () {
    $server = DatabaseServer::factory()->create();
    $tenant = makeShardTenant($server);

    expect($tenant->databaseServer->is($server))->toBeTrue()
        ->and($server->tenants()->count())->toBe(1)
        ->and($server->tenants->first()->is($tenant))->toBeTrue();
});

it('treats a null capacity as unlimited', function () {
    $server = DatabaseServer::factory()->create(['max_tenants' => null]);
    makeShardTenant($server);
    makeShardTenant($server);

    expect($server->hasCapacity())->toBeTrue()
        ->and($server->isAvailable())->toBeTrue();
});

it('reports no capacity once the cap is reached', function () {
    $server = DatabaseServer::factory()->withCapacity(1)->create();
    expect($server->hasCapacity())->toBeTrue();

    makeShardTenant($server);

    expect($server->hasCapacity())->toBeFalse()
        ->and($server->isAvailable())->toBeFalse();
});

it('is unavailable when inactive even with spare capacity', function () {
    $server = DatabaseServer::factory()->inactive()->create();

    expect($server->hasCapacity())->toBeTrue()
        ->and($server->isAvailable())->toBeFalse();
});

it('encrypts the server password at rest', function () {
    $server = DatabaseServer::factory()->create(['password' => 'super-secret']);

    expect($server->password)->toBe('super-secret')
        ->and($server->getRawOriginal('password'))->not->toBe('super-secret');
});

it('lists active servers heaviest weight first', function () {
    DatabaseServer::factory()->inactive()->create(['name' => 'off', 'weight' => 99]);
    DatabaseServer::factory()->create(['name' => 'light', 'weight' => 1]);
    DatabaseServer::factory()->create(['name' => 'heavy', 'weight' => 10]);

    expect(DatabaseServer::active()->pluck('name')->all())->toBe(['heavy', 'light']);
});

it('registers and re-registers a server from the CLI', function () {
    $this->artisan('shards:register', [
        'name' => 'shard-eu-1',
        'host' => 'db-eu-1.internal',
        '--weight' => 5,
        '--max-tenants' => 100,
    ])->assertSuccessful();

    $server = DatabaseServer::firstWhere('name', 'shard-eu-1');
    expect($server)->not->toBeNull()
        ->and($server->host)->toBe('db-eu-1.internal')
        ->and($server->weight)->toBe(5)
        ->and($server->max_tenants)->toBe(100)
        ->and($server->is_active)->toBeTrue();

    // Re-registering the same name updates in place (idempotent).
    $this->artisan('shards:register', [
        'name' => 'shard-eu-1',
        'host' => 'db-eu-1b.internal',
        '--inactive' => true,
    ])->assertSuccessful();

    expect(DatabaseServer::where('name', 'shard-eu-1')->count())->toBe(1)
        ->and($server->fresh()->host)->toBe('db-eu-1b.internal')
        ->and($server->fresh()->is_active)->toBeFalse();
});
