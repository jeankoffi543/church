<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\PushCampaignStatus;
use App\Http\Controllers\Controller;
use App\Jobs\SendPushCampaign;
use App\Models\PushCampaign;
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
