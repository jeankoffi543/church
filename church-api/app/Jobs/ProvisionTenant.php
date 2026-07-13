<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\ProvisioningStatus;
use App\Mail\ChurchWelcomeMail;
use App\Models\Tenant;
use App\Models\User;
use App\Support\AccessControl;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Middleware\WithoutOverlapping;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Role;
use Stancl\Tenancy\Events\TenantCreated;
use Stancl\Tenancy\Jobs\CreateDatabase;
use Stancl\Tenancy\Jobs\MigrateDatabase;
use Stancl\Tenancy\Jobs\SeedDatabase;
use Throwable;

/**
 * Build a new church's database off the request (CHR-173). Dispatched on
 * {@see TenantCreated}, it walks the provisioning state
 * machine — Provisioning → (create → migrate → seed → first admin) → Ready — and
 * on any failure lands the tenant in Failed with the error, so the signup wizard
 * can poll the outcome instead of blocking the HTTP request through a full
 * MySQL create + migration + seed.
 *
 * Idempotent by design: a tenant already Ready is left untouched, so a redelivery
 * — or a duplicate dispatch — never re-creates the database or clobbers a good
 * provision (WithoutOverlapping additionally serialises concurrent workers).
 */
class ProvisionTenant implements ShouldQueue
{
    use Queueable;

    public function __construct(public Tenant $tenant) {}

    /**
     * @return array<int, object>
     */
    public function middleware(): array
    {
        return [(new WithoutOverlapping($this->tenant->getTenantKey()))->dontRelease()->expireAfter(600)];
    }

    public function handle(): void
    {
        $tenant = $this->tenant;

        // A pre-existing / externally managed database (adoption, test fixtures)
        // has nothing to build — mirror CreateDatabase halting the pipeline.
        if ($tenant->getInternal('create_database') === false) {
            return;
        }

        // Already built (duplicate dispatch / retry) — do not re-provision.
        if ($tenant->fresh()?->provisioning_status === ProvisioningStatus::Ready) {
            return;
        }

        $tenant->markProvisioning();

        dispatch_sync(new CreateDatabase($tenant));
        dispatch_sync(new MigrateDatabase($tenant));
        dispatch_sync(new SeedDatabase($tenant));

        $admin = $this->seedFirstAdmin($tenant);

        $tenant->markReady();

        $this->sendWelcome($tenant, $admin);
    }

    public function failed(Throwable $exception): void
    {
        // Don't flip an already-provisioned tenant to Failed if a duplicate run
        // lost the race on CreateDatabase ("database already exists").
        if ($this->tenant->fresh()?->provisioning_status !== ProvisioningStatus::Ready) {
            $this->tenant->markFailed($exception->getMessage());
        }
    }

    /**
     * Create the church's first Super Admin inside its freshly built database
     * from the credentials the signup stashed on the tenant, then wipe them.
     * Returns the admin's public details (for the welcome email), or null when
     * there was no deferred admin (e.g. back-office / adopted tenants).
     *
     * @return array{name: string, email: string}|null
     */
    private function seedFirstAdmin(Tenant $tenant): ?array
    {
        $admin = $tenant->pending_admin;

        if (! is_array($admin) || empty($admin['email'])) {
            return null;
        }

        $tenant->run(function () use ($admin): void {
            $user = User::create([
                'name' => $admin['name'],
                'email' => $admin['email'],
                'password' => $admin['password'], // already hashed; the cast is hash-aware
                'is_active' => true,
            ]);

            $user->assignRole(Role::findOrCreate(AccessControl::SUPER_ADMIN, 'web'));
        });

        $tenant->forceFill(['pending_admin' => null])->save();

        return ['name' => (string) $admin['name'], 'email' => (string) $admin['email']];
    }

    /**
     * Welcome the new church's admin once the site is live (CHR-178), with a
     * link straight to their back-office. No-op for tenants without a deferred
     * admin (back-office / adopted churches).
     *
     * @param  array{name: string, email: string}|null  $admin
     */
    private function sendWelcome(Tenant $tenant, ?array $admin): void
    {
        if ($admin === null) {
            return;
        }

        $domain = $tenant->domains()->where('is_primary', true)->value('domain')
            ?? $tenant->slug.'.'.config('tenancy.central_root_domain');

        Mail::to($admin['email'])->queue(
            new ChurchWelcomeMail($tenant->name ?? $tenant->slug, $admin['name'], "https://{$domain}/admins/login"),
        );
    }
}
