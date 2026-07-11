<?php

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;

/*
| CHR-151 — the capstone. Two REAL, fully-provisioned tenants; prove that data,
| Sanctum tokens and files from tenant A can never reach tenant B. Full
| bootstrappers are active here (Tenancy suite), so `$tenant->run()` performs a
| real database + storage switch — the same isolation production relies on.
*/

beforeEach(function () {
    $this->centralDb = sys_get_temp_dir().'/chr151_central_'.Str::random(8).'.sqlite';
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
});

it('provisions two physically separate databases', function () {
    $a = Tenant::factory()->create();
    $b = Tenant::factory()->create();

    expect($a->database()->getName())->not->toBe($b->database()->getName())
        ->and(File::exists(database_path($a->database()->getName())))->toBeTrue()
        ->and(File::exists(database_path($b->database()->getName())))->toBeTrue();
});

it('isolates data, Sanctum tokens and storage between two tenants', function () {
    $a = Tenant::factory()->create();
    $b = Tenant::factory()->create();

    // ── Data: a user created in A never appears in B ─────────────────
    $a->run(fn () => User::factory()->create(['email' => 'pastor@a.test']));
    $b->run(fn () => User::factory()->create(['email' => 'pastor@b.test']));

    expect($a->run(fn () => User::query()->where('email', 'pastor@a.test')->exists()))->toBeTrue()
        ->and($a->run(fn () => User::query()->where('email', 'pastor@b.test')->exists()))->toBeFalse()
        ->and($b->run(fn () => User::query()->where('email', 'pastor@a.test')->exists()))->toBeFalse();

    // ── Tokens: a token minted in A cannot be resolved in B ──────────
    $plainToken = $a->run(function () {
        return User::factory()->create()->createToken('studio')->plainTextToken;
    });

    expect($a->run(fn () => PersonalAccessToken::findToken($plainToken)))->not->toBeNull()
        ->and($b->run(fn () => PersonalAccessToken::findToken($plainToken)))->toBeNull();

    // ── Storage: the same path holds each tenant's own bytes ─────────
    $a->run(fn () => Storage::disk('public')->put('media/logo.txt', 'TENANT-A'));
    $b->run(fn () => Storage::disk('public')->put('media/logo.txt', 'TENANT-B'));

    expect($a->run(fn () => Storage::disk('public')->get('media/logo.txt')))->toBe('TENANT-A')
        ->and($b->run(fn () => Storage::disk('public')->get('media/logo.txt')))->toBe('TENANT-B');
});
