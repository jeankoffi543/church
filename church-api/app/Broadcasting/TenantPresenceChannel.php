<?php

declare(strict_types=1);

namespace App\Broadcasting;

use Illuminate\Broadcasting\PresenceChannel;

/**
 * A presence broadcast channel namespaced to the active tenant (CHR-156).
 *
 * Extends {@see PresenceChannel} (wire name `presence-…`) with the same
 * `tenant.{key}.` prefixing as {@see TenantChannel}. Presence membership — who is
 * currently connected — is the feature (e.g. the live-studio operator roster);
 * the authorization callback in `routes/channels.php` returns each member's info
 * and stays isolated per church.
 */
class TenantPresenceChannel extends PresenceChannel
{
    public function __construct(string $name)
    {
        parent::__construct(TenantChannel::prefix().$name);
    }
}
