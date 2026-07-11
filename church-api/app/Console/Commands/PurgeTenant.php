<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use App\Models\TenantAudit;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('tenants:purge {tenant : Tenant id} {--force : Skip the confirmation}')]
#[Description('Permanently delete a tenant and drop its database (CHR-150). Irreversible — back up first with tenants:backup.')]
class PurgeTenant extends Command
{
    public function handle(): int
    {
        $tenant = Tenant::query()->find($this->argument('tenant'));

        if ($tenant === null) {
            $this->error('Église introuvable.');

            return self::FAILURE;
        }

        if (! $this->option('force')
            && ! $this->confirm("Supprimer DÉFINITIVEMENT l'église « {$tenant->name} » ({$tenant->id}) et sa base de données ?", false)) {
            $this->comment('Annulé.');

            return self::SUCCESS;
        }

        // Recorded before deletion so the trail survives the tenant.
        TenantAudit::create([
            'tenant_id' => $tenant->id,
            'action' => 'purged',
            'meta' => ['slug' => $tenant->slug, 'name' => $tenant->name],
        ]);

        // Firing TenantDeleted drops the tenant database (CHR-135 pipeline).
        $tenant->delete();

        $this->info("Église {$tenant->id} supprimée définitivement.");

        return self::SUCCESS;
    }
}
