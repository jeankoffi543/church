<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Platform;

use App\Enums\TenantStatus;
use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Readiness + capacity endpoint for load balancers and autoscalers (CHR-194).
 * Public and central (no tenancy) — probes the central DB + cache and reports
 * the tenant footprint. Returns 503 when a dependency is down so an LB can drain
 * the node. The plain liveness probe stays at /up.
 */
class HealthController extends Controller
{
    public function index(): JsonResponse
    {
        $database = $this->probe(fn (): bool => DB::connection(config('tenancy.database.central_connection'))->getPdo() !== null);
        $cache = $this->probe(function (): bool {
            Cache::store()->put('health:ping', '1', 5);

            return Cache::store()->get('health:ping') === '1';
        });

        $healthy = $database && $cache;

        return response()->json([
            'status' => $healthy ? 'ok' : 'degraded',
            'checks' => [
                'database' => $database,
                'cache' => $cache,
            ],
            'capacity' => [
                'tenants' => Tenant::query()->count(),
                'active_tenants' => Tenant::query()->where('status', TenantStatus::Active)->count(),
            ],
            'time' => now()->toIso8601String(),
        ], $healthy ? 200 : 503);
    }

    private function probe(callable $check): bool
    {
        try {
            return (bool) $check();
        } catch (Throwable) {
            return false;
        }
    }
}
