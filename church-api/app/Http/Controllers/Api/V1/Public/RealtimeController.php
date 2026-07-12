<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Public;

use App\Broadcasting\TenantChannel;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class RealtimeController extends Controller
{
    /**
     * Expose the active tenant's realtime coordinates so the client subscribes to
     * the right, tenant-isolated channels (CHR-155). The backend broadcasts on
     * `tenant.{key}.live`; the browser must prefix its Echo subscription the same
     * way. The Reverb host/key stay shared for now and come from the client's own
     * env — per-tenant Reverb wiring is CHR-157.
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => [
                'channel_prefix' => TenantChannel::prefix(),
            ],
        ]);
    }
}
