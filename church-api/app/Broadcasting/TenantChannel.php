<?php

declare(strict_types=1);

namespace App\Broadcasting;

use App\Http\Controllers\Api\V1\Public\RealtimeController;
use Illuminate\Broadcasting\Channel;
use RuntimeException;

/**
 * A public broadcast channel namespaced to the active tenant (CHR-155).
 *
 * Every church shares a single Reverb server, whose channel namespace is global.
 * A bare `live` channel would therefore fan every broadcast out to *all* tenants'
 * listeners — a cross-tenant leak. Prefixing with the tenant key isolates each
 * church's realtime traffic on its own `tenant.{key}.live` channel. Clients learn
 * the matching subscriber prefix from the public `realtime` endpoint
 * ({@see RealtimeController}).
 */
class TenantChannel extends Channel
{
    public function __construct(string $name)
    {
        parent::__construct(self::prefix().$name);
    }

    /**
     * The `tenant.{key}.` channel prefix for the active tenant.
     *
     * @throws RuntimeException when called outside a tenant context — broadcasting
     *                          on a global channel would leak events across tenants.
     */
    public static function prefix(): string
    {
        $tenant = tenant();

        if ($tenant === null) {
            throw new RuntimeException(
                'Cannot build a tenant broadcast channel outside a tenant context: '
                .'broadcasting on a global channel would leak realtime events across tenants.'
            );
        }

        return 'tenant.'.$tenant->getTenantKey().'.';
    }
}
