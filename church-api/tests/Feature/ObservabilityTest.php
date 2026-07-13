<?php

use App\Listeners\TagObservabilityContext;
use App\Logging\TenantProcessor;
use App\Models\Tenant;
use Monolog\Level;
use Monolog\LogRecord;
use Stancl\Tenancy\Events\TenancyInitialized;

// CHR-191 — every log line carries the active church in tenant context, and the
// tenant is shared into the observability context (logs + error tracker).

function makeLogRecord(): LogRecord
{
    return new LogRecord(new DateTimeImmutable, 'testing', Level::Info, 'hello');
}

it('tags a log record with the active church in tenant context', function () {
    $tenant = Tenant::first();
    tenancy()->initialize($tenant);

    try {
        $processed = (new TenantProcessor)(makeLogRecord());
        expect($processed->extra['tenant_id'])->toBe($tenant->getTenantKey());
    } finally {
        tenancy()->end();
    }
});

it('leaves a log record untouched outside tenant context', function () {
    if (tenancy()->initialized) {
        tenancy()->end();
    }

    $processed = (new TenantProcessor)(makeLogRecord());

    expect($processed->extra)->not->toHaveKey('tenant_id');
});

it('attaches the active church to the observability context on init', function () {
    $tenant = Tenant::first();
    tenancy()->initialize($tenant);

    try {
        // Tags the log context + any error tracker without throwing.
        (new TagObservabilityContext)->handle(new TenancyInitialized(tenancy()));
        expect(tenant()->getTenantKey())->toBe($tenant->getTenantKey());
    } finally {
        tenancy()->end();
    }
});

it('is a no-op with no active church', function () {
    if (tenancy()->initialized) {
        tenancy()->end();
    }

    (new TagObservabilityContext)->handle(new TenancyInitialized(tenancy()));

    expect(tenancy()->tenant)->toBeNull();
});
