<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\DatabaseServer;

/**
 * Chooses the database server a new tenant should be provisioned on (CHR-163).
 */
class ShardSelector
{
    /**
     * Pick the best server for a new tenant: among ACTIVE servers with spare
     * capacity, the one least loaded RELATIVE TO ITS WEIGHT — so a heavier server
     * takes proportionally more tenants before it's considered "as loaded" as a
     * lighter one. Returns null when the registry is empty or every server is
     * full/inactive; the tenant then falls back to the default connection (the
     * pre-sharding, single-host behaviour), so an empty registry changes nothing.
     */
    public function select(): ?DatabaseServer
    {
        return DatabaseServer::query()
            ->where('is_active', true)
            ->withCount('tenants')
            ->get()
            ->filter(fn (DatabaseServer $server): bool => $server->max_tenants === null || $server->tenants_count < $server->max_tenants)
            ->sortBy(fn (DatabaseServer $server): float => $server->tenants_count / max(1, $server->weight))
            ->first();
    }
}
