<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Identity;

use App\Enums\MembershipStatus;
use App\Http\Controllers\Controller;
use App\Models\Identity;
use App\Models\Member;
use App\Models\Membership;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * An identity's churches (CHR-166): follow / leave a church, claim its own local
 * member record, and control who can see the follow. Runs on the `identity` guard
 * in central context; claiming dips into the tenant's DB to match a member.
 */
class MembershipController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $memberships = $request->user()->memberships()->with('tenant.domains')->latest()->get();

        return response()->json(['data' => $memberships->map(fn (Membership $m) => $this->payload($m))]);
    }

    public function follow(Request $request, Tenant $tenant): JsonResponse
    {
        $validated = $request->validate([
            'is_public' => ['sometimes', 'boolean'],
        ]);

        $membership = Membership::firstOrCreate(
            ['identity_id' => $request->user()->id, 'tenant_id' => $tenant->id],
            ['status' => MembershipStatus::Follower, 'is_public' => $validated['is_public'] ?? true],
        );

        return response()->json(
            ['data' => $this->payload($membership->load('tenant.domains'))],
            $membership->wasRecentlyCreated ? 201 : 200,
        );
    }

    public function update(Request $request, Tenant $tenant): JsonResponse
    {
        $membership = $this->membershipFor($request->user(), $tenant);

        $validated = $request->validate([
            'is_public' => ['required', 'boolean'],
        ]);

        $membership->update(['is_public' => $validated['is_public']]);

        return response()->json(['data' => $this->payload($membership->load('tenant.domains'))]);
    }

    public function destroy(Request $request, Tenant $tenant): JsonResponse
    {
        $this->membershipFor($request->user(), $tenant)->delete();

        return response()->json(['message' => 'Vous ne suivez plus cette église.']);
    }

    public function claim(Request $request, Tenant $tenant): JsonResponse
    {
        /** @var Identity $identity */
        $identity = $request->user();

        $localMemberId = $this->findLocalMember($tenant, $identity);

        if ($localMemberId === null) {
            return response()->json(['message' => 'Aucun membre correspondant à votre profil dans cette église.'], 404);
        }

        $takenByAnother = Membership::query()
            ->where('tenant_id', $tenant->id)
            ->where('local_member_id', $localMemberId)
            ->where('identity_id', '!=', $identity->id)
            ->exists();

        if ($takenByAnother) {
            return response()->json(['message' => 'Ce membre a déjà été revendiqué par un autre compte.'], 409);
        }

        $membership = Membership::updateOrCreate(
            ['identity_id' => $identity->id, 'tenant_id' => $tenant->id],
            ['status' => MembershipStatus::Member, 'local_member_id' => $localMemberId, 'claimed_at' => now()],
        );

        return response()->json(['data' => $this->payload($membership->load('tenant.domains'))]);
    }

    private function membershipFor(Identity $identity, Tenant $tenant): Membership
    {
        return $identity->memberships()->where('tenant_id', $tenant->id)->firstOrFail();
    }

    /** Find a member of $tenant matching the identity's email/phone (in the tenant DB). */
    private function findLocalMember(Tenant $tenant, Identity $identity): ?int
    {
        tenancy()->initialize($tenant);

        try {
            return Member::query()
                ->where(function ($query) use ($identity) {
                    $query->where('email', $identity->email);

                    if ($identity->phone !== null) {
                        $query->orWhere('phone', $identity->phone);
                    }
                })
                ->value('id');
        } finally {
            tenancy()->end();
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(Membership $membership): array
    {
        $tenant = $membership->tenant;
        // The church's primary hostname (falls back to its platform subdomain) so
        // the mobile Hub can reach that church's public API (CHR-186).
        $domain = $tenant?->relationLoaded('domains')
            ? $tenant->domains->firstWhere('is_primary', true)?->domain
            : $tenant?->domains()->where('is_primary', true)->value('domain');

        return [
            'tenant_id' => $membership->tenant_id,
            'church' => $tenant?->name,
            'slug' => $tenant?->slug,
            'domain' => $domain ?? ($tenant?->slug ? $tenant->slug.'.'.config('tenancy.central_root_domain') : null),
            'status' => $membership->status->value,
            'is_claimed' => $membership->isClaimed(),
            'is_public' => $membership->is_public,
            'claimed_at' => $membership->claimed_at?->toIso8601String(),
        ];
    }
}
