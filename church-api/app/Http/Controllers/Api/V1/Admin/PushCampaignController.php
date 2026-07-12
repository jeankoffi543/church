<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\PushCampaignStatus;
use App\Http\Controllers\Controller;
use App\Jobs\SendPushCampaign;
use App\Models\PushCampaign;
use App\Models\PushSubscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * A church's push campaigns (CHR-170): compose in the tenant DB, then fan out to
 * the church's subscribers via the central registry (the SendPushCampaign job).
 */
class PushCampaignController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => PushCampaign::query()->latest()->get()]);
    }

    /** A campaign with its delivery + open analytics (CHR-171). */
    public function show(PushCampaign $campaign): JsonResponse
    {
        $opened = $campaign->receipts()->whereNotNull('opened_at')->count();

        return response()->json(['data' => [
            ...$campaign->toArray(),
            'opened_count' => $opened,
            'open_rate' => $campaign->delivered_count > 0 ? round($opened / $campaign->delivered_count, 3) : 0.0,
        ]]);
    }

    /** How many subscribers a segment would reach — the composer's audience preview. */
    public function audience(Request $request): JsonResponse
    {
        $segment = $request->query('segment');

        $subscriptions = PushSubscription::query()
            ->where('tenant_id', tenant()->getTenantKey())
            ->where('muted', false)
            ->get();

        if ($segment !== null && $segment !== '') {
            $subscriptions = $subscriptions->filter(fn (PushSubscription $s) => in_array($segment, $s->topics ?? [], true));
        }

        return response()->json(['recipients' => $subscriptions->count()]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'body' => ['required', 'string', 'max:500'],
            'segment' => ['nullable', 'string', 'max:64'],
            'data' => ['sometimes', 'array'],
        ]);

        $campaign = PushCampaign::create([
            ...$validated,
            'status' => PushCampaignStatus::Draft,
        ]);

        return response()->json(['data' => $campaign], 201);
    }

    public function send(PushCampaign $campaign): JsonResponse
    {
        if ($campaign->status === PushCampaignStatus::Sent) {
            return response()->json(['message' => 'Cette campagne a déjà été envoyée.'], 422);
        }

        $campaign->update(['status' => PushCampaignStatus::Sending]);
        SendPushCampaign::dispatch($campaign->id, tenant()->getTenantKey());

        return response()->json([
            'message' => 'Envoi de la campagne lancé.',
            'data' => $campaign->fresh(),
        ]);
    }
}
