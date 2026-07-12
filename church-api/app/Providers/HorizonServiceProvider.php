<?php

namespace App\Providers;

use App\Models\CentralUser;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Laravel\Horizon\HorizonApplicationServiceProvider;

class HorizonServiceProvider extends HorizonApplicationServiceProvider
{
    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        parent::boot();

        // Horizon::routeSmsNotificationsTo('15556667777');
        // Horizon::routeMailNotificationsTo('example@example.com');
        // Horizon::routeSlackNotificationsTo('slack-webhook-url', '#channel');
    }

    /**
     * Register the Horizon gate (CHR-160).
     *
     * Horizon is a PLATFORM tool, not a tenant one, so it is restricted to central
     * super-admins. The `central` guard is token-based (Sanctum) and isolated from
     * tenant users by construction, so we resolve it explicitly rather than trust
     * the default web guard. Deny-by-default: no central super-admin, no access.
     * (Wiring the browser session for the dashboard belongs to the super-admin
     * console, CHR-183; the `horizon:*` CLI needs no gate.)
     */
    protected function gate(): void
    {
        Gate::define('viewHorizon', function (): bool {
            $user = Auth::guard('central')->user();

            return $user instanceof CentralUser && $user->isSuperAdmin();
        });
    }
}
