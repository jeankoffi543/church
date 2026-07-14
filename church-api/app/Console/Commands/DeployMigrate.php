<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('deploy:migrate')]
#[Description('Zero-downtime deploy migration (CHR-193): central schema first, then every tenant database. Migrations must be additive (expand/contract) so old + new code both run against them.')]
class DeployMigrate extends Command
{
    public function handle(): int
    {
        $this->components->info('Migrating the central schema…');
        $central = $this->call('migrate', [
            '--path' => 'database/migrations/central',
            '--database' => config('tenancy.database.central_connection'),
            '--force' => true,
        ]);

        if ($central !== self::SUCCESS) {
            $this->components->error('Central migration failed — aborting before touching tenant databases.');

            return self::FAILURE;
        }

        $this->components->info('Migrating tenant databases…');
        $tenants = $this->call('tenants:migrate', ['--force' => true]);

        if ($tenants !== self::SUCCESS) {
            return self::FAILURE;
        }

        $this->components->info('Deploy migrations complete.');

        return self::SUCCESS;
    }
}
