<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Actions\ApplyPaystackCharge;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\WebhookEventResource;
use App\Models\WebhookEvent;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class WebhookEventController extends Controller
{
    /**
     * The webhook audit log — newest first, filterable by status.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        return WebhookEventResource::collection(
            WebhookEvent::query()
                ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
                ->when($request->filled('event'), fn ($q) => $q->where('event', $request->string('event')))
                ->latestFirst()
                ->paginate($request->integer('per_page', 20))
        );
    }

    /**
     * Replay a stored webhook: re-run reconciliation from its payload (forced,
     * so a confirmation/receipt is re-applied regardless of the current state).
     */
    public function replay(WebhookEvent $webhookEvent, ApplyPaystackCharge $applyCharge): WebhookEventResource
    {
        $payload = $webhookEvent->payload ?? [];
        $data = (array) ($payload['data'] ?? []);
        $event = $payload['event'] ?? $webhookEvent->event;

        $status = $event === 'charge.success' ? $applyCharge($data, force: true) : 'ignored';

        $webhookEvent->update(['status' => $status, 'processed_at' => now()]);

        return new WebhookEventResource($webhookEvent->refresh());
    }
}
