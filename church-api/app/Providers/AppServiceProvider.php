<?php

namespace App\Providers;

use App\Contracts\DomainRegistrar;
use App\Models\Convert;
use App\Models\Member;
use App\Models\PersonalAccessToken;
use App\Models\User;
use App\Services\Registrar\GandiRegistrar;
use App\Services\Registrar\NullRegistrar;
use App\Services\Registrar\StubRegistrar;
use App\Support\AccessControl;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Domain reseller driver (CHR-203) — null (default) prices nothing; a
        // real driver (Gandi/OpenSRS/…) plugs in via config('domains.registrar').
        $this->app->singleton(DomainRegistrar::class, function (): DomainRegistrar {
            $currency = (string) config('domains.registrar.currency', 'USD');

            return match (config('domains.registrar.driver')) {
                'gandi' => new GandiRegistrar(
                    config('domains.registrar.gandi.api_key'),
                    (string) config('domains.registrar.gandi.scheme', 'Apikey'),
                    (string) config('domains.registrar.gandi.endpoint', 'https://api.gandi.net/v5'),
                    $currency,
                ),
                'stub' => new StubRegistrar($currency),
                default => new NullRegistrar,
            };
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Super Admin immunity: a TENANT user holding the Super Admin role is
        // granted every ability automatically, even abilities not attached to it
        // in the database. Returning `null` lets all other checks fall through to
        // the normal Spatie permission resolution. This is a tenant-side role, so
        // a non-User principal (e.g. a central super-admin resolving the Horizon
        // gate) is not our concern here — let it fall through untouched.
        Gate::before(function (mixed $user, string $ability): ?bool {
            return $user instanceof User && $user->hasRole(AccessControl::SUPER_ADMIN) ? true : null;
        });

        // Look tokens up in the right database per context — central vs tenant
        // (CHR-165). Without this, platform/identity tokens (central DB) were
        // searched on the default connection and never authenticated in prod.
        Sanctum::usePersonalAccessTokenModel(PersonalAccessToken::class);

        // Stable aliases for FollowUp::followable — stored in the DB instead
        // of the FQCN so a future namespace/class rename doesn't orphan rows.
        // Non-enforcing: Spatie Permission's own polymorphic relations (on
        // User) must keep resolving via FQCN, since they're outside this map.
        Relation::morphMap([
            'convert' => Convert::class,
            'member' => Member::class,
        ]);

        // The church (tenant) schema lives in the tenant migration path (CHR-135).
        // Feature tests exercise tenant-context features, so load that path in the
        // test environment for RefreshDatabase to build the schema on the default
        // connection. Production/tenant DBs get it through `tenants:migrate`.
        if ($this->app->runningUnitTests()) {
            $this->loadMigrationsFrom(database_path('migrations/tenant'));
            // Feature tests resolve a tenant by domain, so the central schema
            // (tenants/domains) must exist on the shared in-memory connection too.
            $this->loadMigrationsFrom(database_path('migrations/central'));
        }
    }
}
