<?php

namespace App\Console\Commands;

use App\Enums\DomainType;
use App\Enums\SslStatus;
use App\Enums\TenantStatus;
use App\Models\Domain;
use App\Models\Tenant;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Str;

#[Signature('tenants:adopt
    {database : Name of the EXISTING tenant database (sqlite filename or MySQL db name)}
    {domain : Primary hostname that resolves to this tenant}
    {--name= : Human-readable church name}
    {--slug= : Subdomain slug (defaults from the name/domain)}
    {--type=custom : Domain type (custom|subdomain)}
    {--migrate : Also run pending tenant migrations to bring the adopted DB up to date}
    {--force : Skip the confirmation prompt}')]
#[Description('Register an EXISTING database as a tenant without creating or wiping it — the way legacy single-church data is adopted as the first tenant (CHR-135).')]
class AdoptTenant extends Command
{
    public function handle(): int
    {
        $database = (string) $this->argument('database');
        $domain = Str::lower((string) $this->argument('domain'));
        $type = DomainType::tryFrom((string) $this->option('type')) ?? DomainType::Custom;
        $name = (string) ($this->option('name') ?: $domain);
        $slug = Str::slug((string) ($this->option('slug') ?: $name));

        if (Domain::query()->where('domain', $domain)->exists()) {
            $this->error("The domain [{$domain}] is already mapped to a tenant.");

            return self::FAILURE;
        }

        if ($this->tenantDriverIsSqlite() && ! file_exists(database_path($database))) {
            $this->error("SQLite database [{$database}] was not found in the database path. Adoption only registers an EXISTING database.");

            return self::FAILURE;
        }

        if (! $this->option('force') && ! $this->confirm("Adopt existing database [{$database}] as the tenant for [{$domain}] (its data will NOT be wiped)?", true)) {
            $this->comment('Aborted.');

            return self::SUCCESS;
        }

        $tenant = new Tenant;
        $tenant->name = $name;
        $tenant->slug = $slug;
        $tenant->status = TenantStatus::Active;
        // Point the tenant at the existing database and short-circuit the
        // provisioning pipeline so CreateDatabase never touches (and never
        // truncates) it — this is stancl's adoption switch.
        $tenant->setInternal('db_name', $database);
        $tenant->setInternal('create_database', false);
        $tenant->save();

        $tenant->domains()->create([
            'domain' => $domain,
            'type' => $type,
            'is_primary' => true,
            'verified_at' => now(),
            'ssl_status' => $type === DomainType::Subdomain ? SslStatus::Issued : null,
        ]);

        $this->info("Adopted database [{$database}] as tenant [{$tenant->id}] · domain [{$domain}].");

        if ($this->option('migrate')) {
            $this->line('Bringing the adopted database up to date…');
            Artisan::call('tenants:migrate', ['--tenants' => [$tenant->id]], $this->output);
        } else {
            $this->comment("Run `php artisan tenants:migrate --tenants={$tenant->id}` to apply any pending migrations.");
        }

        return self::SUCCESS;
    }

    /**
     * Whether tenant databases resolve to the SQLite driver (dev), so we can
     * cheaply verify the target file exists before adopting it.
     */
    private function tenantDriverIsSqlite(): bool
    {
        $template = config('tenancy.database.template_tenant_connection')
            ?: config('tenancy.database.central_connection');

        return config("database.connections.{$template}.driver") === 'sqlite';
    }
}
