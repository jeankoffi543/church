<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\DatabaseServer;
use App\Models\Tenant;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('tenants:move-shard
    {tenant : The tenant id to move}
    {--to= : Name of the target database server in the registry}
    {--force : Skip the availability check and the "data copied?" confirmation}')]
#[Description('Move a tenant to another database server (shard): re-point its connection to the target server (CHR-164). Copy the tenant database to the target FIRST — the command reminds you how.')]
class MoveTenantShard extends Command
{
    public function handle(): int
    {
        $tenant = Tenant::find($this->argument('tenant'));

        if ($tenant === null) {
            $this->error("Église introuvable : {$this->argument('tenant')}.");

            return self::FAILURE;
        }

        $target = DatabaseServer::firstWhere('name', (string) $this->option('to'));

        if ($target === null) {
            $this->error("Serveur cible introuvable dans le registre : « {$this->option('to')} ».");

            return self::FAILURE;
        }

        if ($tenant->database_server_id === $target->id) {
            $this->warn("L'église est déjà sur « {$target->name} ».");

            return self::SUCCESS;
        }

        if (! $this->option('force') && ! $target->isAvailable()) {
            $this->error("« {$target->name} » est inactif ou plein — utilisez --force pour outrepasser.");

            return self::FAILURE;
        }

        $dbName = $tenant->database()->getName();
        $from = $tenant->databaseServer?->name ?? 'connexion par défaut';

        $this->line("Déplacement de l'église [{$tenant->id}] · base « {$dbName} » : {$from} → « {$target->name} » ({$target->host}).");
        $this->warn("Copiez d'abord les données vers la cible, p.ex. :\n  mysqldump {$dbName} | mysql -h {$target->host} {$dbName}");

        if (! $this->option('force') && ! $this->confirm('Données copiées vers la cible ? Re-router le tenant maintenant ?', false)) {
            $this->comment('Annulé — aucune modification.');

            return self::SUCCESS;
        }

        // Re-point the tenant's connection at the target server (host/creds +
        // read/write split) and link it in the registry.
        $target->applyTo($tenant);
        $tenant->save();

        $this->info("Église [{$tenant->id}] re-routée vers « {$target->name} ». Laissez tourner puis supprimez l'ancienne base une fois validée.");

        return self::SUCCESS;
    }
}
