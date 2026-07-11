<?php

namespace App\Http\Controllers\Api\Platform;

use App\Enums\TenantStatus;
use App\Http\Controllers\Controller;
use App\Models\PushSubscription;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

/**
 * The mobile Hub's per-tenant push registry (CHR-149). A device subscribes to a
 * church's topics; a broadcast from that church reaches only its followers. The
 * actual FCM/APNs delivery is a later ops concern — this is the contract.
 */
class PushController extends Controller
{
    private const ALLOWED_TOPICS = ['news', 'live', 'events'];

    public function index(Request $request): JsonResponse
    {
        $token = (string) $request->query('device_token', '');
        abort_if($token === '', Response::HTTP_UNPROCESSABLE_ENTITY, 'device_token is required.');

        $subscriptions = PushSubscription::query()
            ->where('device_token', $token)
            ->with('tenant')
            ->get()
            ->map(fn (PushSubscription $sub): array => $this->payload($sub));

        return response()->json(['data' => $subscriptions]);
    }

    public function subscribe(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'device_token' => ['required', 'string', 'max:512'],
            'platform' => ['nullable', Rule::in(['ios', 'android', 'web'])],
            'tenant_id' => ['required', 'string', Rule::exists(Tenant::class, 'id')],
            'topics' => ['nullable', 'array'],
            'topics.*' => [Rule::in(self::ALLOWED_TOPICS)],
        ]);

        $tenant = Tenant::query()->find($validated['tenant_id']);
        abort_unless($tenant !== null && $tenant->status === TenantStatus::Active, Response::HTTP_UNPROCESSABLE_ENTITY, 'Cette église est indisponible.');

        $subscription = PushSubscription::query()->updateOrCreate(
            ['device_token' => $validated['device_token'], 'tenant_id' => $validated['tenant_id']],
            [
                'platform' => $validated['platform'] ?? 'android',
                'topics' => $validated['topics'] ?? ['news', 'live'],
            ],
        );

        return response()->json(['data' => $this->payload($subscription->load('tenant'))], Response::HTTP_CREATED);
    }

    public function unsubscribe(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'device_token' => ['required', 'string'],
            'tenant_id' => ['required', 'string'],
        ]);

        PushSubscription::query()
            ->where('device_token', $validated['device_token'])
            ->where('tenant_id', $validated['tenant_id'])
            ->delete();

        return response()->json(['message' => 'Désabonné des notifications de cette église.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(PushSubscription $subscription): array
    {
        return [
            'tenant_id' => $subscription->tenant_id,
            'tenant_name' => $subscription->tenant?->name,
            'platform' => $subscription->platform,
            'topics' => $subscription->topics ?? [],
            'topic_names' => $subscription->topicNames(),
        ];
    }
}
