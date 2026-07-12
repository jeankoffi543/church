<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Models\Tenant;
use App\Services\ShardSelector;
use Stancl\Tenancy\Events\CreatingTenant;

/**
 * Places a newly created tenant on a database server from the registry (CHR-163)
 * BEFORE stancl provisions its database, by writing the server's credentials into
 * the tenant's per-DB internals (`db_host`/`db_port`/`db_username`/`db_password`
 * + the `db_connection` template). stancl's DatabaseConfig then creates the tenant
 * DB on that shard. Runs on `CreatingTenant` so the placement is persisted with
 * the tenant, ahead of the CreateDatabase job.
 */
class AssignTenantToShard
{
    public function __construct(private ShardSelector $selector) {}

    public function handle(CreatingTenant $event): void
    {
        /** @var Tenant $tenant */
        $tenant = $event->tenant;

        // Never override an explicit placement: already pinned to a shard, an
        // adopted database (`db_name`), or pre-set credentials (`db_host`).
        if ($tenant->database_server_id !== null
            || $tenant->getInternal('db_name') !== null
            || $tenant->getInternal('db_host') !== null) {
            return;
        }

        $server = $this->selector->select();

        // Empty/full registry → leave the tenant on the default connection.
        if ($server === null) {
            return;
        }

        $server->applyTo($tenant);
    }
}
