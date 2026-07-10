<?php

use App\Enums\DomainType;
use App\Enums\SslStatus;
use App\Enums\SubscriptionStatus;
use App\Enums\TenantStatus;
use App\Models\Domain;
use App\Models\Tenant;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Stancl\Tenancy\Events\TenantCreated;

/*
| CHR-134 — the bespoke central `tenants` / `domains` schema and its model
| casts. The central connection is isolated onto a throwaway SQLite file and
| tenant provisioning (TenantCreated) is faked, so these tests never touch the
| dev central DB nor spin up tenant databases.
*/

beforeEach(function () {
    $this->centralDb = sys_get_temp_dir().'/chr134_central_'.Str::random(8).'.sqlite';
    touch($this->centralDb);
    config(['database.connections.central.database' => $this->centralDb]);
    DB::purge('central');
    Artisan::call('migrate', [
        '--database' => 'central',
        '--path' => 'database/migrations/central',
        '--realpath' => false,
    ]);
    Event::fake([TenantCreated::class]); // skip DB provisioning, keep id generation
});

afterEach(function () {
    DB::purge('central');
    @unlink($this->centralDb);
});

it('keeps business identity as real columns but db credentials virtual', function () {
    expect(Tenant::getCustomColumns())
        ->toContain('name', 'slug', 'plan_id', 'subscription_status', 'trial_ends_at', 'features', 'studio_enabled', 'studio_seats', 'status')
        ->not->toContain('tenancy_db_password', 'tenancy_db_username', 'tenancy_db_host');
});

it('casts business fields and marks db credentials encrypted', function () {
    $casts = (new Tenant)->getCasts();

    expect($casts)
        ->toMatchArray([
            'subscription_status' => SubscriptionStatus::class,
            'status' => TenantStatus::class,
            'trial_ends_at' => 'datetime',
            'features' => 'array',
            'studio_enabled' => 'boolean',
            'studio_seats' => 'integer',
            'tenancy_db_username' => 'encrypted',
            'tenancy_db_password' => 'encrypted',
        ]);
});

it('encrypts tenant db credentials at rest and returns plaintext to stancl', function () {
    $tenant = Tenant::create([
        'name' => 'Grace Assembly',
        'slug' => 'grace-'.Str::lower(Str::random(5)),
        'tenancy_db_username' => 'church_grace',
        'tenancy_db_password' => 'S3cr3t-P@ss',
    ]);

    $rawData = DB::connection('central')->table('tenants')->where('id', $tenant->id)->value('data');

    expect($rawData)
        ->not->toContain('S3cr3t-P@ss')
        ->not->toContain('church_grace');

    $fresh = $tenant->fresh();

    expect($fresh->tenancy_db_password)->toBe('S3cr3t-P@ss')
        ->and($fresh->tenancy_db_username)->toBe('church_grace')
        // The path stancl uses when building the tenant connection (CHR-137).
        ->and($fresh->getInternal('db_password'))->toBe('S3cr3t-P@ss');
});

it('casts tenant business attributes to their types', function () {
    $tenant = Tenant::factory()->withStudio(3)->create([
        'subscription_status' => SubscriptionStatus::Active,
        'features' => ['store' => true],
    ])->fresh();

    expect($tenant->status)->toBe(TenantStatus::Active)
        ->and($tenant->subscription_status)->toBe(SubscriptionStatus::Active)
        ->and($tenant->studio_enabled)->toBeTrue()
        ->and($tenant->studio_seats)->toBe(3)
        ->and($tenant->features)->toBe(['store' => true])
        ->and($tenant->trial_ends_at)->toBeInstanceOf(CarbonInterface::class);
});

it('resolves domains through the custom model with typed metadata', function () {
    expect(config('tenancy.domain_model'))->toBe(Domain::class);

    $tenant = Tenant::factory()->create();
    $domain = $tenant->domains()->create([
        'domain' => $tenant->slug.'.churchapp.io',
        'type' => DomainType::Custom,
        'ssl_status' => SslStatus::Pending,
        'is_primary' => true,
    ])->fresh();

    expect($domain)->toBeInstanceOf(Domain::class)
        ->and($domain->type)->toBe(DomainType::Custom)
        ->and($domain->ssl_status)->toBe(SslStatus::Pending)
        ->and($domain->is_primary)->toBeTrue();
});
