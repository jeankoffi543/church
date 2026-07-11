<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\Feature;
use App\Enums\SubscriptionStatus;
use App\Enums\TenantStatus;
use Database\Factories\TenantFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Stancl\Tenancy\Contracts\TenantWithDatabase;
use Stancl\Tenancy\Database\Concerns\HasDatabase;
use Stancl\Tenancy\Database\Concerns\HasDomains;
use Stancl\Tenancy\Database\Models\Tenant as BaseTenant;

/**
 * The landlord's record of a church (tenant).
 *
 * Implements {@see TenantWithDatabase} so each tenant owns a physically isolated
 * database ({@see HasDatabase} creates/migrates/deletes it, {@see HasDomains}
 * links the hostnames that resolve it). Lives on the `central` connection.
 *
 * Storage split (CHR-134):
 *  - Business identity → real, queryable columns (see {@see getCustomColumns()}).
 *  - Per-tenant DB credentials (tenancy_db_host/name/username/password/connection)
 *    → the base `data` JSON column. stancl reads them through getInternal(); the
 *    username/password are cast `encrypted` so they are ciphered at rest yet the
 *    connection builder still receives plaintext. They are intentionally NOT real
 *    columns: as always-present nullable columns their nulls would be merged over
 *    the template connection config by DatabaseConfig::tenantConfig().
 */
class Tenant extends BaseTenant implements TenantWithDatabase
{
    /** @use HasFactory<TenantFactory> */
    use HasDatabase, HasDomains, HasFactory;

    /**
     * Attributes persisted as real table columns; everything else is encoded
     * into the `data` JSON column by the VirtualColumn trait.
     *
     * @return list<string>
     */
    public static function getCustomColumns(): array
    {
        return [
            'id',
            'name',
            'slug',
            'plan_id',
            'subscription_status',
            'trial_ends_at',
            'features',
            'studio_enabled',
            'studio_seats',
            'status',
        ];
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'subscription_status' => SubscriptionStatus::class,
            'status' => TenantStatus::class,
            'trial_ends_at' => 'datetime',
            'features' => 'array',
            'studio_enabled' => 'boolean',
            'studio_seats' => 'integer',
            // Virtual (data-stored) credentials — VirtualColumn applies the cast
            // to decoded attributes, so these decrypt on read and encrypt at rest.
            'tenancy_db_username' => 'encrypted',
            'tenancy_db_password' => 'encrypted',
        ];
    }

    /**
     * The subscription plan this tenant is on (central DB).
     */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    /**
     * The tenant's current platform subscription (central DB).
     */
    public function subscription(): HasOne
    {
        return $this->hasOne(Subscription::class)->latestOfMany();
    }

    /**
     * Whether a product feature is enabled for this tenant. A per-tenant override
     * in the `features` column (add-on / grandfathering) wins; otherwise the plan
     * decides.
     */
    public function hasFeature(string|Feature $feature): bool
    {
        $key = $feature instanceof Feature ? $feature->value : $feature;

        $overrides = $this->features ?? [];
        if (array_key_exists($key, $overrides)) {
            return (bool) $overrides[$key];
        }

        return (bool) $this->plan?->hasFeature($key);
    }

    /**
     * The flat list of enabled feature keys — handed to the front-end so it can
     * hide the modules a tenant's plan doesn't include.
     *
     * @return list<string>
     */
    public function activeFeatures(): array
    {
        return array_values(array_map(
            fn (Feature $f): string => $f->value,
            array_filter(Feature::cases(), fn (Feature $f): bool => $this->hasFeature($f)),
        ));
    }
}
