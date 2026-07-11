<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

#[Signature('tenants:backup {--tenant= : One tenant id; omit to back up every tenant}')]
#[Description('Back up each tenant database (CHR-150). SQLite databases are copied; for MySQL/Postgres run the driver dump printed as guidance.')]
class BackupTenants extends Command
{
    public function handle(): int
    {
        $tenants = $this->option('tenant')
            ? Tenant::query()->whereKey($this->option('tenant'))->get()
            : Tenant::all();

        if ($tenants->isEmpty()) {
            $this->warn('Aucune église à sauvegarder.');

            return self::SUCCESS;
        }

        $isSqlite = config('database.connections.'.config('tenancy.database.central_connection').'.driver') === 'sqlite';
        $stamp = now()->format('Ymd-His');
        $done = 0;

        foreach ($tenants as $tenant) {
            $name = $tenant->database()->getName();
            $dir = storage_path("app/backups/tenants/{$tenant->id}");
            File::ensureDirectoryExists($dir);

            if (! $isSqlite) {
                $this->warn("[{$tenant->id}] base « {$name} » (non-sqlite) : lancez `mysqldump {$name}` vers {$dir}.");

                continue;
            }

            $source = database_path($name);
            if (! File::exists($source)) {
                $this->warn("[{$tenant->id}] aucune base trouvée ({$name}).");

                continue;
            }

            $destination = "{$dir}/{$stamp}.sqlite";
            File::copy($source, $destination);
            $this->info("[{$tenant->id}] sauvegardée → {$destination}");
            $done++;
        }

        $this->info("{$done} base(s) sauvegardée(s).");

        return self::SUCCESS;
    }
}
