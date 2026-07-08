<?php

namespace App\Providers;

use App\Models\Convert;
use App\Models\Member;
use App\Models\User;
use App\Support\AccessControl;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Super Admin immunity: a user holding the Super Admin role is granted
        // every ability automatically, even abilities not attached to it in the
        // database. Returning `null` lets all other checks fall through to the
        // normal Spatie permission resolution.
        Gate::before(function (User $user, string $ability): ?bool {
            return $user->hasRole(AccessControl::SUPER_ADMIN) ? true : null;
        });

        // Stable aliases for FollowUp::followable — stored in the DB instead
        // of the FQCN so a future namespace/class rename doesn't orphan rows.
        // Non-enforcing: Spatie Permission's own polymorphic relations (on
        // User) must keep resolving via FQCN, since they're outside this map.
        Relation::morphMap([
            'convert' => Convert::class,
            'member' => Member::class,
        ]);
    }
}
