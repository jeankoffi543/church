<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Identity;

use App\Enums\TenantStatus;
use App\Http\Controllers\Controller;
use App\Models\PushReceipt;
use App\Models\PushSubscription;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Mobile Hub for an identity (CHR-168): discover churches (with a "following"
 * flag), and link push devices so the Push Hub (E5) can reach the churchgoer
 * across every church they follow.
 */
class HubController extends Controller
{
    /** Search active churches, flagging the ones this identity already follows. */
    public function discover(Request $request): JsonResponse
    {
        $query = Str::lower(trim((string) $request->query('q', '')));
        $followed = $request->user()->memberships()->pluck('tenant_id')->all();

        $churches = Tenant::query()
            ->where('status', TenantStatus::Active)
            ->when($query !== '', fn ($builder) => $builder->where(fn ($sub) => $sub
                ->whereRaw('lower(name) like ?', ["%{$query}%"])
                ->orWhereRaw('lower(slug) like ?', ["%{$query}%"])))
            ->with(['domains' => fn ($d) => $d->where('is_primary', true)])
            ->orderBy('name')
            ->limit(20)
            ->get()
            ->map(fn (Tenant $tenant): array => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'domain' => $tenant->domains->first()?->domain,
                'following' => in_array($tenant->id, $followed, true),
            ]);

        return response()->json(['data' => $churches]);
    }

    /** Register this identity's device for push from a church it follows. */
    public function registerDevice(Request $request, Tenant $tenant): JsonResponse
    {
        $identity = $request->user();

        if (! $identity->memberships()->where('tenant_id', $tenant->id)->exists()) {
            return response()->json(['message' => "Suivez d'abord cette église pour activer les notifications."], 403);
        }

        $validated = $request->validate([
            'device_token' => ['required', 'string', 'max:512'],
            'platform' => ['required', 'string', 'in:ios,android,web'],
            'topics' => ['sometimes', 'array'],
            'topics.*' => ['string', 'max:64'],
        ]);

        $subscription = PushSubscription::updateOrCreate(
            ['device_token' => $validated['device_token'], 'tenant_id' => $tenant->id],
            ['identity_id' => $identity->id, 'platform' => $validated['platform'], 'topics' => $validated['topics'] ?? []],
        );

        return response()->json(
            ['data' => $this->devicePayload($subscription->load('tenant'))],
            $subscription->wasRecentlyCreated ? 201 : 200,
        );
    }

    /** All push subscriptions linked to this identity, across churches. */
    public function devices(Request $request): JsonResponse
    {
        $subscriptions = $request->user()->pushSubscriptions()->with('tenant')->get();

        return response()->json(['data' => $subscriptions->map(fn (PushSubscription $s) => $this->devicePayload($s))]);
    }

    /** Drop every subscription for a device (e.g. on logout / app uninstall). */
    public function forgetDevice(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'device_token' => ['required', 'string', 'max:512'],
        ]);

        $removed = $request->user()->pushSubscriptions()->where('device_token', $validated['device_token'])->delete();

        return response()->json(['removed' => $removed]);
    }

    /** Mute a church's push on all this identity's devices (opt-out, CHR-171). */
    public function mute(Request $request, Tenant $tenant): JsonResponse
    {
        return $this->setMuted($request, $tenant, true);
    }

    /** Re-enable a church's push (opt back in). */
    public function unmute(Request $request, Tenant $tenant): JsonResponse
    {
        return $this->setMuted($request, $tenant, false);
    }

    /** Report that a campaign notification was opened, for the church's analytics. */
    public function markOpened(Request $request, Tenant $tenant): JsonResponse
    {
        $validated = $request->validate([
            'campaign_id' => ['required', 'integer'],
            'device_token' => ['required', 'string', 'max:512'],
        ]);

        $ownsDevice = $request->user()->pushSubscriptions()
            ->where('tenant_id', $tenant->id)
            ->where('device_token', $validated['device_token'])
            ->exists();

        if (! $ownsDevice) {
            return response()->json(['message' => 'Appareil inconnu pour cette église.'], 403);
        }

        tenancy()->initialize($tenant);

        try {
            $opened = PushReceipt::query()
                ->where('push_campaign_id', $validated['campaign_id'])
                ->where('device_token', $validated['device_token'])
                ->whereNull('opened_at')
                ->update(['opened_at' => now()]);
        } finally {
            tenancy()->end();
        }

        return response()->json(['opened' => $opened > 0]);
    }

    private function setMuted(Request $request, Tenant $tenant, bool $muted): JsonResponse
    {
        $devices = $request->user()->pushSubscriptions()
            ->where('tenant_id', $tenant->id)
            ->update(['muted' => $muted]);

        return response()->json(['muted' => $muted, 'devices' => $devices]);
    }

    /**
     * @return array<string, mixed>
     */
    private function devicePayload(PushSubscription $subscription): array
    {
        return [
            'id' => $subscription->id,
            'device_token' => $subscription->device_token,
            'platform' => $subscription->platform,
            'tenant_id' => $subscription->tenant_id,
            'church' => $subscription->tenant?->name,
            'topics' => $subscription->topics ?? [],
        ];
    }
}
