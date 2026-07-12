<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\PushCampaignStatus;
use App\Enums\QueueName;
use App\Jobs\Middleware\LimitPerTenant;
use App\Models\PushCampaign;
use App\Models\PushReceipt;
use App\Models\PushSubscription;
use App\Services\Push\PushManager;
use App\Services\Push\PushMessage;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Fan a church's push campaign out to its subscribers (CHR-170). The campaign
 * lives in the TENANT DB; its audience lives in the CENTRAL push registry
 * (`push_subscriptions` for this tenant, optionally narrowed to a segment/topic).
 * Runs on the `push` queue, funnelled per tenant; delivery counts are written back
 * to the campaign, and tokens the provider rejected (unregistered) are pruned.
 */
class SendPushCampaign implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $campaignId, public string $tenantId)
    {
        $this->onQueue(QueueName::Push->value);
    }

    public function handle(PushManager $push): void
    {
        $campaign = PushCampaign::find($this->campaignId);

        if ($campaign === null || $campaign->status === PushCampaignStatus::Sent) {
            return;
        }

        // The audience is the church's subscribers in the central registry. The
        // tenant id is passed explicitly rather than read from context so the
        // fan-out is correct on any worker (a worker restores tenant context per
        // job, but we don't depend on it for the central query).
        $subscriptions = PushSubscription::query()
            ->where('tenant_id', $this->tenantId)
            ->where('muted', false) // opt-out (CHR-171)
            ->get();

        if ($campaign->segment !== null) {
            $subscriptions = $subscriptions
                ->filter(fn (PushSubscription $s) => in_array($campaign->segment, $s->topics ?? [], true))
                ->values();
        }

        $result = $push->send(
            new PushMessage($campaign->title, $campaign->body, $campaign->data ?? []),
            $subscriptions,
        );

        // Per-device receipts for analytics + open tracking (CHR-171).
        $delivered = array_flip($result->delivered);
        foreach ($subscriptions as $subscription) {
            PushReceipt::updateOrCreate(
                ['push_campaign_id' => $campaign->id, 'device_token' => $subscription->device_token],
                ['delivered' => isset($delivered[$subscription->device_token])],
            );
        }

        // Drop tokens the provider rejected (unregistered devices).
        if ($result->failed !== []) {
            PushSubscription::query()
                ->where('tenant_id', $this->tenantId)
                ->whereIn('device_token', $result->failed)
                ->delete();
        }

        $campaign->update([
            'status' => PushCampaignStatus::Sent,
            'recipients_count' => $subscriptions->count(),
            'delivered_count' => $result->successCount(),
            'failed_count' => $result->failureCount(),
            'sent_at' => now(),
        ]);
    }

    /**
     * @return array<int, object>
     */
    public function middleware(): array
    {
        return [new LimitPerTenant];
    }
}
