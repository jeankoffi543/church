<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Platform;

use App\Contracts\DomainRegistrar;
use App\Enums\DomainStatus;
use App\Enums\DomainType;
use App\Enums\SslStatus;
use App\Http\Controllers\Controller;
use App\Models\CentralUser;
use App\Models\Domain;
use App\Models\Tenant;
use App\Models\TenantAudit;
use App\Services\Signup\DomainAvailabilityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Super-admin domain purchase (CHR-207): buy a free domain for a church through
 * the configured registrar and attach it as a verified custom domain. Gated by
 * auth:central + super-admin. The platform is the reseller/registrant, so no
 * per-church WHOIS data and (for now) no automatic churchgoer billing — the
 * owner decides to buy; the billing model is a follow-up.
 */
class DomainPurchaseController extends Controller
{
    public function purchase(
        Request $request,
        Tenant $tenant,
        DomainAvailabilityService $availability,
        DomainRegistrar $registrar,
    ): JsonResponse {
        $validated = $request->validate([
            'domain' => ['required', 'string', 'max:253'],
            'years' => ['nullable', 'integer', 'min:1', 'max:10'],
        ]);

        $name = strtolower(trim($validated['domain']));
        $years = (int) ($validated['years'] ?? 1);

        // Only buy something that is actually free (RDAP + our DB).
        $check = $availability->check($name);
        if (($check['available'] ?? null) !== true) {
            return response()->json([
                'message' => "Ce domaine n'est pas disponible à l'enregistrement.",
                'availability' => $check,
            ], 422);
        }

        $result = $registrar->register($name, $years);
        if (! $result->successful) {
            return response()->json([
                'message' => $result->message ?? "L'enregistrement du domaine a échoué.",
            ], 502);
        }

        // We own it now — no TXT proof needed. Attach as a verified (not yet
        // primary) custom domain; the church activates it as its main address.
        $domain = Domain::create([
            'tenant_id' => $tenant->getKey(),
            'domain' => $name,
            'type' => DomainType::Custom,
            'is_primary' => false,
            'status' => DomainStatus::Verified,
            'verified_at' => now(),
            'ssl_status' => SslStatus::Issued,
            'verification_token' => null,
        ]);

        $actor = $request->user();
        TenantAudit::create([
            'central_user_id' => $actor instanceof CentralUser ? $actor->id : null,
            'tenant_id' => $tenant->getKey(),
            'action' => 'domain.purchased',
            'meta' => ['domain' => $name, 'years' => $years, 'reference' => $result->reference],
        ]);

        return response()->json([
            'data' => [
                'domain' => $domain->domain,
                'status' => $domain->status?->value,
                'reference' => $result->reference,
            ],
        ], 201);
    }
}
