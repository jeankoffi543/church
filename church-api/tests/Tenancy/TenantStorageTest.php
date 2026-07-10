<?php

use App\Enums\TenantStatus;
use App\Models\Tenant;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/*
| CHR-136 — per-tenant storage isolation. Central is isolated onto a throwaway
| SQLite file; each tenant is pointed at a throwaway DB (no provisioning needed
| for a storage test) and its storage directory + DB are removed afterwards.
*/

function tenantWithDatabase(): Tenant
{
    $db = 'chr136_'.Str::lower(Str::random(10)).'.sqlite';
    touch(database_path($db));

    $tenant = new Tenant;
    $tenant->status = TenantStatus::Active;
    $tenant->setInternal('db_name', $db);      // point at the throwaway file
    $tenant->setInternal('create_database', false); // …and never (re)create/wipe it

    $tenant->save();

    return $tenant;
}

beforeEach(function () {
    $this->centralDb = sys_get_temp_dir().'/chr136_central_'.Str::random(8).'.sqlite';
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
        File::deleteDirectory(storage_path('tenant'.$tenant->getTenantKey()));
        try {
            $tenant->delete();
        } catch (Throwable) {
            // ignore
        }
    });
    DB::purge('central');
    @unlink($this->centralDb);
    foreach (glob(database_path('chr136_*.sqlite')) ?: [] as $leftover) {
        @unlink($leftover);
    }
});

it('isolates local file storage between tenants at the same logical path', function () {
    $a = tenantWithDatabase();
    $b = tenantWithDatabase();

    $a->run(fn () => Storage::disk('public')->put('media/logo.txt', 'TENANT-A'));
    $b->run(fn () => Storage::disk('public')->put('media/logo.txt', 'TENANT-B'));

    // Same relative path, but each tenant only ever sees its own bytes.
    expect($a->run(fn () => Storage::disk('public')->get('media/logo.txt')))->toBe('TENANT-A')
        ->and($b->run(fn () => Storage::disk('public')->get('media/logo.txt')))->toBe('TENANT-B');

    // …backed by physically separate directories.
    expect(File::exists(storage_path('tenant'.$a->getTenantKey().'/app/public/media/logo.txt')))->toBeTrue()
        ->and(File::exists(storage_path('tenant'.$b->getTenantKey().'/app/public/media/logo.txt')))->toBeTrue()
        ->and(File::exists(storage_path('app/public/media/logo.txt')))->toBeFalse(); // never the shared root
});

it('prefixes the S3 disk with tenants/{id} inside tenancy', function () {
    expect(config('tenancy.filesystem.disks'))->toContain('s3');

    $tenant = tenantWithDatabase();

    $tenant->run(function () use ($tenant) {
        expect(config('filesystems.disks.s3.root'))->toBe('tenants/'.$tenant->getTenantKey());
    });

    // Reverted once tenancy ends.
    expect(config('filesystems.disks.s3.root'))->not->toBe('tenants/'.$tenant->getTenantKey());
});
