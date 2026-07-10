<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

/**
 * The baseline every freshly provisioned tenant database ships with:
 * the access-control matrix (roles + permissions), the currency table and the
 * bible verses. Church content is a tenant's own data and is NOT seeded here.
 *
 * Runs inside the tenant context via `tenants:seed` (see SeedDatabase job).
 */
class TenantDatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->call([
            AccessControlSeeder::class,
            CurrencySeeder::class,
            BibleVerseSeeder::class,
        ]);
    }
}
