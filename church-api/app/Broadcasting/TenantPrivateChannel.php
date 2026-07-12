<?php

declare(strict_types=1);

namespace App\Broadcasting;

use Illuminate\Broadcasting\PrivateChannel;

/**
 * A private broadcast channel namespaced to the active tenant (CHR-156).
 *
 * Extends {@see PrivateChannel} (wire name `private-…`) with the same
 * `tenant.{key}.` prefixing as {@see TenantChannel}, so authenticated back-office
 * realtime stays isolated per church. Authorization is defined in
 * `routes/channels.php` and resolved on the tenant's own database because
 * `/broadcasting/auth` runs inside the tenancy middleware (CHR-155).
 */
class TenantPrivateChannel extends PrivateChannel
{
    public function __construct(string $name)
    {
        parent::__construct(TenantChannel::prefix().$name);
    }
}
