<?php

use App\Enums\PushCampaignStatus;
use App\Models\PushCampaign;
use App\Models\PushSubscription;
use App\Models\Tenant;
use App\Services\Push\PushManager;
use App\Services\Push\PushResult;

// CHR-170: a church composes a push campaign (tenant DB) and fans it out to its
// own subscribers in the central registry, with segmentation + token pruning.

function subscribe(string $token, array $topics = [], string $platform = 'android'): PushSubscription
{
    return PushSubscription::create([
        'device_token' => $token,
        'platform' => $platform,
        'tenant_id' => Tenant::first()->id,
        'topics' => $topics,
    ]);
}

it('requires manage_members to compose a campaign', function () {
    actingAsAdminWith([]);

    $this->postJson('/api/v1/admin/push/campaigns', ['title' => 'T', 'body' => 'B'])->assertForbidden();
});

it('composes a draft campaign', function () {
    actingAsAdminWith(['manage_members']);

    $this->postJson('/api/v1/admin/push/campaigns', ['title' => 'Culte', 'body' => 'Ce soir 18h', 'segment' => 'news'])
        ->assertCreated()
        ->assertJsonPath('data.status', 'draft');
});

it('fans a campaign out to the church subscribers and records counts', function () {
    actingAsAdminWith(['manage_members']);
    subscribe('a');
    subscribe('b', platform: 'ios');
    $campaign = PushCampaign::create(['title' => 'T', 'body' => 'B', 'status' => PushCampaignStatus::Draft]);

    $this->postJson("/api/v1/admin/push/campaigns/{$campaign->id}/send")->assertOk();

    $campaign->refresh();
    expect($campaign->status)->toBe(PushCampaignStatus::Sent)
        ->and($campaign->recipients_count)->toBe(2)
        ->and($campaign->delivered_count)->toBe(2); // log provider delivers all
});

it('targets only the segment subscribers', function () {
    actingAsAdminWith(['manage_members']);
    subscribe('news-1', ['news']);
    subscribe('live-1', ['live']);
    $campaign = PushCampaign::create(['title' => 'T', 'body' => 'B', 'segment' => 'news', 'status' => PushCampaignStatus::Draft]);

    $this->postJson("/api/v1/admin/push/campaigns/{$campaign->id}/send")->assertOk();

    expect($campaign->fresh()->recipients_count)->toBe(1);
});

it('prunes tokens the provider rejects', function () {
    actingAsAdminWith(['manage_members']);
    subscribe('good');
    subscribe('bad');
    $campaign = PushCampaign::create(['title' => 'T', 'body' => 'B', 'status' => PushCampaignStatus::Draft]);

    $this->app->instance(PushManager::class, new class extends PushManager
    {
        public function send($message, $subscriptions): PushResult
        {
            return new PushResult(['good'], ['bad']);
        }
    });

    $this->postJson("/api/v1/admin/push/campaigns/{$campaign->id}/send")->assertOk();

    expect(PushSubscription::where('device_token', 'bad')->exists())->toBeFalse()
        ->and(PushSubscription::where('device_token', 'good')->exists())->toBeTrue()
        ->and($campaign->fresh()->failed_count)->toBe(1);
});

it('does not re-send an already sent campaign', function () {
    actingAsAdminWith(['manage_members']);
    $campaign = PushCampaign::create(['title' => 'T', 'body' => 'B', 'status' => PushCampaignStatus::Sent]);

    $this->postJson("/api/v1/admin/push/campaigns/{$campaign->id}/send")->assertStatus(422);
});
