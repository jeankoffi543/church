<?php

use App\Enums\ProvisioningStatus;
use App\Enums\TenantStatus;
use App\Mail\ChurchWelcomeMail;
use App\Models\BibleVerse;
use App\Models\Currency;
use App\Models\Domain;
use App\Models\Tenant;
use App\Models\User;
use App\Support\AccessControl;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

/*
| CHR-135 — the provisioning pipeline (CreateDatabase → MigrateDatabase →
| SeedDatabase) and legacy adoption. Central is isolated onto a throwaway
| SQLite file; tenant databases created during a test are torn down afterwards.
*/

beforeEach(function () {
    $this->centralDb = sys_get_temp_dir().'/chr135_central_'.Str::random(8).'.sqlite';
    touch($this->centralDb);
    config(['database.connections.central.database' => $this->centralDb]);
    DB::purge('central');
    Artisan::call('migrate', [
        '--database' => 'central',
        '--path' => 'database/migrations/central',
        '--realpath' => false,
    ]);
});

afterEach(function () {
    // Deleting each tenant fires DeleteDatabase, which unlinks its SQLite file.
    Tenant::all()->each(function (Tenant $tenant) {
        try {
            $tenant->delete();
        } catch (Throwable) {
            // ignore
        }
    });
    DB::purge('central');
    @unlink($this->centralDb);
    foreach (glob(database_path('chr135_legacy_*.sqlite')) ?: [] as $leftover) {
        @unlink($leftover);
    }
});

it('walks the provisioning state machine through to ready (CHR-173)', function () {
    $tenant = Tenant::factory()->create(); // ProvisionTenant runs synchronously here

    $fresh = $tenant->fresh();

    expect($fresh->provisioning_status)->toBe(ProvisioningStatus::Ready)
        ->and($fresh->status)->toBe(TenantStatus::Active)
        ->and($fresh->provisioned_at)->not->toBeNull();
});

it('seeds the deferred first admin from the stashed signup credentials (CHR-173)', function () {
    $tenant = Tenant::factory()->create([
        'pending_admin' => [
            'name' => 'Pasteur Paul',
            'email' => 'paul@grace.test',
            'password' => Hash::make('secret123'),
        ],
    ]);

    // The credentials are consumed then wiped from the central record.
    expect($tenant->fresh()->pending_admin)->toBeNull();

    $tenant->run(function () {
        $admin = User::query()->where('email', 'paul@grace.test')->first();
        expect($admin)->not->toBeNull()
            ->and($admin->hasRole(AccessControl::SUPER_ADMIN))->toBeTrue()
            ->and(Hash::check('secret123', $admin->password))->toBeTrue();
    });
});

it('emails the new church admin once the site is ready (CHR-178)', function () {
    Mail::fake();

    Tenant::factory()->create([
        'pending_admin' => [
            'name' => 'Pasteur Paul',
            'email' => 'paul@grace.test',
            'password' => Hash::make('secret123'),
        ],
    ]);

    Mail::assertQueued(
        ChurchWelcomeMail::class,
        fn (ChurchWelcomeMail $mail): bool => $mail->hasTo('paul@grace.test') && $mail->adminName === 'Pasteur Paul',
    );
});

it('provisions a tenant database with the full church schema and baseline seed', function () {
    $tenant = Tenant::factory()->create(); // synchronous CreateDatabase → Migrate → Seed

    $tenant->run(function () {
        // Full church schema landed in the tenant DB.
        expect(Schema::hasTable('users'))->toBeTrue()
            ->and(Schema::hasTable('personal_access_tokens'))->toBeTrue()
            ->and(Schema::hasTable('settings'))->toBeTrue()
            ->and(Schema::hasTable('members'))->toBeTrue()
            ->and(Schema::hasTable('roles'))->toBeTrue();

        // Baseline seed ran (access control + currencies + bible), nothing else.
        expect(Role::count())->toBeGreaterThan(0)
            ->and(Currency::count())->toBeGreaterThan(0)
            ->and(BibleVerse::count())->toBeGreaterThan(0)
            ->and(User::count())->toBe(0); // no demo/church data
    });
});

it('adopts an existing database as a tenant without creating or wiping it', function () {
    // A throwaway "legacy" DB carrying a sentinel row we must not lose.
    $legacy = 'chr135_legacy_'.Str::lower(Str::random(6)).'.sqlite';
    $legacyPath = database_path($legacy);
    touch($legacyPath);
    config(['database.connections.legacy_probe' => ['driver' => 'sqlite', 'database' => $legacyPath, 'prefix' => '']]);
    DB::connection('legacy_probe')->statement('CREATE TABLE sentinels (id integer primary key, tag text)');
    DB::connection('legacy_probe')->table('sentinels')->insert(['tag' => 'legacy-data']);

    $this->artisan('tenants:adopt', [
        'database' => $legacy,
        'domain' => 'legacy.example.test',
        '--name' => 'Legacy Church',
        '--force' => true,
    ])->assertSuccessful();

    $tenant = Tenant::first();
    expect($tenant)->not->toBeNull()
        ->and($tenant->getInternal('db_name'))->toBe($legacy)
        ->and($tenant->getInternal('create_database'))->toBeFalse()
        ->and(Domain::query()->where('domain', 'legacy.example.test')->exists())->toBeTrue();

    // The existing database was registered, never truncated: sentinel survives.
    DB::purge('legacy_probe');
    expect(DB::connection('legacy_probe')->table('sentinels')->where('tag', 'legacy-data')->exists())->toBeTrue();

    DB::purge('legacy_probe');
});
