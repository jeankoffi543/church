<?php

declare(strict_types=1);

namespace App\Logging;

use Monolog\LogRecord;
use Monolog\Processor\ProcessorInterface;

/**
 * Stamps every log record with the active church when running in tenant context
 * (CHR-191), so logs from a shared worker/web process stay filterable per church.
 * Added to the log channels in config/logging.php.
 */
class TenantProcessor implements ProcessorInterface
{
    public function __invoke(LogRecord $record): LogRecord
    {
        if (! tenancy()->initialized) {
            return $record;
        }

        $tenant = tenant();

        return $record->with(extra: [
            ...$record->extra,
            'tenant_id' => $tenant?->getTenantKey(),
            'tenant_slug' => $tenant?->slug,
        ]);
    }
}
