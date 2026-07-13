<?php

namespace App\Console\Commands;

use App\Models\PushSubscription;
use App\Models\Subscription;
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

        // RGPD: erase the church's personal data held in central tables that carry
        // only a plain tenant_id (no FK cascade). Memberships cascade via their FK;
        // the tenant database itself is dropped by TenantDeleted (CHR-135).
        PushSubscription::query()->where('tenant_id', $tenant->id)->delete();
        Subscription::query()->where('tenant_id', $tenant->id)->delete();

        // Firing TenantDeleted drops the tenant database (CHR-135 pipeline).
        $tenant->delete();

        $this->info("Église {$tenant->id} supprimée définitivement.");

        return self::SUCCESS;
    }
}
