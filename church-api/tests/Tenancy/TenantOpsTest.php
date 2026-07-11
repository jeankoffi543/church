<?php

use App\Models\Tenant;
use App\Models\TenantAudit;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/*
| CHR-150 — multi-tenant ops: central infrastructure tables + the backup/purge
| commands. Central is isolated on a throwaway SQLite file; tenant DBs and
| backup files created during a test are torn down afterwards.
*/

beforeEach(function () {
    $this->centralDb = sys_get_temp_dir().'/chr150_central_'.Str::random(8).'.sqlite';
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
    Tenant::all()->each(function (Tenant $tenant) {
        File::deleteDirectory(storage_path("app/backups/tenants/{$tenant->id}"));
        try {
            $tenant->delete();
        } catch (Throwable) {
            // ignore
        }
    });
    DB::purge('central');
    @unlink($this->centralDb);
});

it('provisions the central infrastructure tables', function () {
    $has = fn (string $table): bool => Schema::connection('central')->hasTable($table);

    expect($has('cache'))->toBeTrue()
        ->and($has('cache_locks'))->toBeTrue()
        ->and($has('jobs'))->toBeTrue()
        ->and($has('failed_jobs'))->toBeTrue()
        ->and($has('sessions'))->toBeTrue();
});

it('backs up a provisioned tenant database', function () {
    $tenant = Tenant::factory()->create(); // real provisioning → a sqlite file

    $this->artisan('tenants:backup', ['--tenant' => $tenant->id])->assertSuccessful();

    $backups = glob(storage_path("app/backups/tenants/{$tenant->id}/*.sqlite")) ?: [];
    expect($backups)->not->toBeEmpty();
});

it('purges a tenant and keeps an audit record', function () {
    $tenant = Tenant::factory()->create();

    $this->artisan('tenants:purge', ['tenant' => $tenant->id, '--force' => true])->assertSuccessful();

    expect(Tenant::query()->whereKey($tenant->id)->exists())->toBeFalse()
        ->and(TenantAudit::query()->where('action', 'purged')->where('tenant_id', $tenant->id)->exists())->toBeTrue();
});

it('aborts a purge on an unknown tenant', function () {
    $this->artisan('tenants:purge', ['tenant' => 'nope', '--force' => true])->assertFailed();
});
