<?php

declare(strict_types=1);

use App\Providers\TenancyServiceProvider;
use Illuminate\Cache\TaggableStore;
use Illuminate\Support\Facades\Cache;
use Stancl\Tenancy\Bootstrappers\CacheTenancyBootstrapper;

// Regression guard for CHR-153: in tenant context, stancl's CacheTenancyBootstrapper
// tags every cache key per tenant, so a non-taggable store (`database`/`file`) throws
// "This cache store does not support tagging" mid-request. The boot guard turns that
// into a clear, fail-fast configuration error.

it('passes when tenant cache isolation runs on a taggable store', function () {
    config([
        'tenancy.bootstrappers' => [CacheTenancyBootstrapper::class],
        'cache.default' => 'array',
    ]);

    TenancyServiceProvider::guardTaggableCacheStore();

    expect(Cache::store()->getStore())->toBeInstanceOf(TaggableStore::class);
});

it('rejects a non-taggable store when tenant cache isolation is enabled', function () {
    config([
        'tenancy.bootstrappers' => [CacheTenancyBootstrapper::class],
        'cache.default' => 'file',
    ]);

    expect(fn () => TenancyServiceProvider::guardTaggableCacheStore())
        ->toThrow(RuntimeException::class, 'does not support cache tags');
});

it('skips the check when tenant cache isolation is disabled', function () {
    config([
        'tenancy.bootstrappers' => [],
        'cache.default' => 'file',
    ]);

    TenancyServiceProvider::guardTaggableCacheStore();

    // Reaching here without throwing on a non-taggable store is the behaviour
    // under test — the guard is a no-op when tenant cache isolation is off.
    expect(config('cache.default'))->toBe('file');
});
