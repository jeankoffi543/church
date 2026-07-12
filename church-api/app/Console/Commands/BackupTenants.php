<?php

namespace App\Console\Commands;

use App\Models\DatabaseServer;
use App\Models\Tenant;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

#[Signature('tenants:backup
    {--tenant= : One tenant id; omit to back up every tenant}
    {--server= : Only tenants on this database server (per-shard backup, CHR-164)}')]
#[Description('Back up each tenant database (CHR-150). SQLite databases are copied; for MySQL/Postgres run the driver dump printed as guidance. --server backs up a single shard.')]
class BackupTenants extends Command
{
    public function handle(): int
    {
        $query = Tenant::query();

        if ($this->option('tenant')) {
            $query->whereKey($this->option('tenant'));
        }

        if ($server = $this->option('server')) {
            $databaseServer = DatabaseServer::firstWhere('name', $server);

            if ($databaseServer === null) {
                $this->error("Serveur « {$server} » introuvable dans le registre.");

                return self::FAILURE;
            }

            $query->where('database_server_id', $databaseServer->id);
        }

        $tenants = $query->get();

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
