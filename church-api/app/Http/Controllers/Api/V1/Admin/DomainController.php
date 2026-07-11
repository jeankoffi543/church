<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\DomainType;
use App\Enums\SslStatus;
use App\Http\Controllers\Controller;
use App\Models\Domain;
use App\Services\DomainVerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

/**
 * Custom-domain onboarding for a church, from its own back-office (CHR-148).
 * Runs in tenant context; the domains themselves live in the central DB.
 */
class DomainController extends Controller
{
    public function index(): JsonResponse
    {
        $domains = Domain::query()
            ->where('tenant_id', tenant('id'))
            ->orderByDesc('is_primary')
            ->orderBy('id')
            ->get()
            ->map(fn (Domain $domain): array => $this->payload($domain));

        return response()->json(['data' => $domains]);
    }

    public function store(Request $request, DomainVerificationService $verifier): JsonResponse
    {
        $validated = $request->validate([
            'domain' => ['required', 'string', 'max:255', 'regex:/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i', Rule::unique(Domain::class, 'domain')],
        ]);

        $host = Str::lower(trim($validated['domain']));

        abort_if(
            str_ends_with($host, '.'.config('tenancy.central_root_domain')),
            Response::HTTP_UNPROCESSABLE_ENTITY,
            'Ce domaine appartient à la plateforme. Utilisez un domaine que vous possédez.',
        );

        $domain = Domain::create([
            'tenant_id' => tenant('id'),
            'domain' => $host,
            'type' => DomainType::Custom,
            'is_primary' => false,
            'verified_at' => null,
            'ssl_status' => SslStatus::Pending,
            'verification_token' => 'chr_'.Str::lower(Str::random(32)),
        ]);

        return response()->json([
            'data' => $this->payload($domain),
            'instructions' => $verifier->instructions($domain),
        ], Response::HTTP_CREATED);
    }

    public function verify(Domain $domain, DomainVerificationService $verifier): JsonResponse
    {
        $this->authorizeDomain($domain);

        if (! $verifier->verify($domain)) {
            return response()->json([
                'data' => $this->payload($domain),
                'verified' => false,
                'message' => "L'enregistrement TXT n'a pas encore été détecté. La propagation DNS peut prendre quelques minutes.",
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $domain->update(['verified_at' => now(), 'ssl_status' => SslStatus::Issued]);

        return response()->json(['data' => $this->payload($domain), 'verified' => true]);
    }

    public function destroy(Domain $domain): JsonResponse
    {
        $this->authorizeDomain($domain);

        abort_if($domain->is_primary, Response::HTTP_UNPROCESSABLE_ENTITY, 'Le domaine principal ne peut pas être retiré.');

        $domain->delete();

        return response()->json(['message' => 'Domaine retiré.']);
    }

    private function authorizeDomain(Domain $domain): void
    {
        abort_unless($domain->tenant_id === tenant('id'), Response::HTTP_NOT_FOUND);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(Domain $domain): array
    {
        return [
            'id' => $domain->id,
            'domain' => $domain->domain,
            'type' => $domain->type?->value,
            'is_primary' => (bool) $domain->is_primary,
            'verified' => $domain->verified_at !== null,
            'verified_at' => $domain->verified_at?->toIso8601String(),
            'ssl_status' => $domain->ssl_status?->value,
        ];
    }
}
