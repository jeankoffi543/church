<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Tenant broadcast channels (CHR-156)
|--------------------------------------------------------------------------
|
| These callbacks authorize private & presence channel subscriptions. They run
| through `/broadcasting/auth`, which lives INSIDE the tenancy middleware
| (CHR-155): the tenant is resolved from the request Host and $user is the
| Sanctum user on that tenant's OWN database. Channel names are tenant-scoped
| (`tenant.{key}.*`, see App\Broadcasting\Tenant*Channel), and every callback
| additionally asserts the channel's {tenant} segment matches the resolved
| tenant — so a valid token for church A can never authorize church B's channel.
|
*/

// Private back-office channel: realtime notifications for a church's admins
// (new prayer requests, …). Any authenticated user of the tenant is staff, so
// matching the resolved tenant IS the authorization boundary.
Broadcast::channel('tenant.{tenant}.admin', function (User $user, string $tenant): bool {
    return $tenant === tenant()?->getTenantKey();
});

// Presence channel: live-studio operators (régie). Gated on manage_live; returns
// each connected operator's identity for the roster.
Broadcast::channel('tenant.{tenant}.studio', function (User $user, string $tenant): ?array {
    if ($tenant !== tenant()?->getTenantKey() || ! $user->can('manage_live')) {
        return null;
    }

    return ['id' => $user->id, 'name' => $user->name];
});
