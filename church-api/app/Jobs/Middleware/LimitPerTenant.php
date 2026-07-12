<?php

declare(strict_types=1);

namespace App\Jobs\Middleware;

use Closure;
use Illuminate\Support\Facades\Redis;

/**
 * Anti-noisy-neighbor (CHR-160): funnel each tenant's jobs through a bounded
 * concurrency lane so one church's burst can never monopolise the GLOBAL worker
 * fleet. When a church already has {@see $maxConcurrent} jobs running, further
 * ones are released back to the queue for a short delay instead of holding a
 * worker — leaving capacity for every other church.
 *
 * Central (no-tenant) jobs — e.g. Horizon's own bookkeeping — pass straight
 * through untouched.
 */
class LimitPerTenant
{
    public function __construct(
        private int $maxConcurrent = 3,
        private int $releaseAfter = 5,
    ) {}

    public function handle(object $job, Closure $next): void
    {
        $tenant = tenant();

        if ($tenant === null) {
            $next($job);

            return;
        }

        Redis::funnel('tenant-jobs:'.$tenant->getTenantKey())
            ->limit($this->maxConcurrent)
            ->releaseAfter($this->releaseAfter)
            ->then(
                fn () => $next($job),
                fn () => $job->release($this->releaseAfter),
            );
    }
}
