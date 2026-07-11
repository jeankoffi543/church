<?php

namespace App\Http\Controllers\Api\Platform;

use App\Enums\TenantStatus;
use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Church discovery for the mobile Hub (CHR-149): the single app lets a user
 * search and pick their church. Public + central; returns only public info.
 */
class DiscoveryController extends Controller
{
    public function search(Request $request): JsonResponse
    {
        $q = Str::lower(trim((string) $request->query('q', '')));

        $tenants = Tenant::query()
            ->where('status', TenantStatus::Active)
            ->when($q !== '', fn ($query) => $query->where(fn ($sub) => $sub
                ->whereRaw('lower(name) like ?', ["%{$q}%"])
                ->orWhereRaw('lower(slug) like ?', ["%{$q}%"])))
            ->with(['domains' => fn ($d) => $d->where('is_primary', true)])
            ->orderBy('name')
            ->limit(20)
            ->get()
            ->map(fn (Tenant $tenant): array => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'domain' => $tenant->domains->first()?->domain,
            ]);

        return response()->json(['data' => $tenants]);
    }
}
