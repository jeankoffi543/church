<?php

namespace App\Console\Commands;

use App\Enums\DomainType;
use App\Enums\SslStatus;
use App\Enums\SubscriptionStatus;
use App\Enums\TenantStatus;
use App\Models\Domain;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\User;
use App\Support\AccessControl;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Spatie\Permission\Models\Role;

#[Signature('dev:seed-demo {--slug=demo} {--root=localhost} {--port=3000}')]
#[Description('Local dev only: seed plans, a platform super-admin and one fully-provisioned demo church, then print the URLs to test admin / super-admin / public.')]
class SeedDemo extends Command
{
    public function handle(): int
    {
        $slug = (string) $this->option('slug');
        $root = (string) $this->option('root');
        $domain = "{$slug}.{$root}";

        // 1. Plans (central) + a platform super-admin.
        $this->call('db:seed', ['--database' => 'central', '--class' => 'Database\Seeders\PlanSeeder', '--force' => true]);
        $this->call('platform:create-super-admin', ['email' => 'ops@churchapp.io', '--password' => 'password']);

        // 2. A demo church — idempotent on the slug.
        $tenant = Tenant::query()->where('slug', $slug)->first();

        if ($tenant === null) {
            $tenant = Tenant::create([
                'name' => ucfirst($slug).' Church',
                'slug' => $slug,
                'status' => TenantStatus::Active,
                'plan_id' => Plan::query()->where('code', 'growth')->value('id'),
                'subscription_status' => SubscriptionStatus::Active,
            ]);

            Domain::query()->firstOrCreate(
                ['domain' => $domain],
                ['tenant_id' => $tenant->id, 'type' => DomainType::Subdomain, 'is_primary' => true, 'verified_at' => now(), 'ssl_status' => SslStatus::Issued],
            );
        }

        // 3. The church's Super Admin (inside the tenant DB).
        $adminEmail = "admin@{$slug}.test";
        $tenant->run(function () use ($adminEmail): void {
            $user = User::query()->firstOrCreate(
                ['email' => $adminEmail],
                ['name' => 'Admin Démo', 'password' => 'password', 'is_active' => true],
            );
            $user->assignRole(Role::findOrCreate(AccessControl::SUPER_ADMIN, 'web'));
        });

        $port = (string) $this->option('port');
        $this->newLine();
        $this->info('✓ Demo church ready.');
        $this->line("  Public site : http://{$domain}:{$port}");
        $this->line("  Church admin: http://{$domain}:{$port}/admins/login  ·  {$adminEmail} / password");
        $this->line('  Platform    : http://127.0.0.1:8001/api/platform/login  ·  ops@churchapp.io / password');
        $this->newLine();
        $this->comment("Add to /etc/hosts:  127.0.0.1  {$domain} app.{$root}");
        $this->comment("Marketing site   :  http://app.{$root}:{$port}/central  (or set NEXT_PUBLIC_MARKETING_HOSTS)");

        return self::SUCCESS;
    }
}
