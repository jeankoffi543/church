<?php

declare(strict_types=1);

namespace App\Models;

use Stancl\Tenancy\Contracts\TenantWithDatabase;
use Stancl\Tenancy\Database\Concerns\HasDatabase;
use Stancl\Tenancy\Database\Concerns\HasDomains;
use Stancl\Tenancy\Database\Models\Tenant as BaseTenant;

/**
 * The landlord's record of a church (tenant).
 *
 * Implements {@see TenantWithDatabase} so each tenant owns a physically
 * isolated database: {@see HasDatabase} drives creation/migration/deletion of
 * that database, {@see HasDomains} links the custom + subdomain hostnames used
 * to resolve it. Lives on the `central` connection (via the base model's
 * CentralConnection trait).
 *
 * CHR-133 keeps this intentionally minimal — every attribute is stored in the
 * base `data` JSON column. CHR-134 promotes the real columns (encrypted DB
 * credentials, plan, subscription status, studio flags) and declares them via
 * getCustomColumns().
 */
class Tenant extends BaseTenant implements TenantWithDatabase
{
    use HasDatabase, HasDomains;
}
