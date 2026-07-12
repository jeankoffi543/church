<?php

use App\Enums\PushCampaignStatus;
use App\Models\Identity;
use App\Models\PushCampaign;
use App\Models\PushReceipt;
use App\Models\PushSubscription;
use App\Models\Tenant;
use Laravel\Sanctum\Sanctum;

// CHR-171: opt-out (mute), per-device receipts, open tracking, campaign analytics,
// and the composer's audience preview.

function sub(string $token, array $attrs = []): PushSubscription
{
    return PushSubscription::create([
        'device_token' => $token,
        'platform' => 'android',
        'tenant_id' => Tenant::first()->id,
        'topics' => [],
        ...$attrs,
    ]);
}

it('lets an identity mute and unmute a church', function () {
    $identity = Identity::factory()->create();
    $tenantId = Tenant::first()->id;
    $subscription = sub('x', ['identity_id' => $identity->id]);
    Sanctum::actingAs($identity, ['identity'], 'identity');

    $this->postJson("/api/identity/churches/{$tenantId}/push/mute")->assertOk()->assertJsonPath('muted', true);
    expect($subscription->fresh()->muted)->toBeTrue();

    $this->postJson("/api/identity/churches/{$tenantId}/push/unmute")->assertOk()->assertJsonPath('muted', false);
    expect($subscription->fresh()->muted)->toBeFalse();
});

it('excludes muted subscribers from the fan-out', function () {
    actingAsAdminWith(['manage_members']);
    sub('active');
    sub('muted', ['muted' => true]);
    $campaign = PushCampaign::create(['title' => 'T', 'body' => 'B', 'status' => PushCampaignStatus::Draft]);

    $this->postJson("/api/v1/admin/push/campaigns/{$campaign->id}/send")->assertOk();

    expect($campaign->fresh()->recipients_count)->toBe(1);
});

it('writes a receipt per device and starts at a zero open rate', function () {
    actingAsAdminWith(['manage_members']);
    sub('d1');
    $campaign = PushCampaign::create(['title' => 'T', 'body' => 'B', 'status' => PushCampaignStatus::Draft]);

    $this->postJson("/api/v1/admin/push/campaigns/{$campaign->id}/send")->assertOk();
    expect($campaign->receipts()->count())->toBe(1);

    $response = $this->getJson("/api/v1/admin/push/campaigns/{$campaign->id}")->assertOk();
    expect($response->json('data.opened_count'))->toBe(0)
        ->and((float) $response->json('data.open_rate'))->toBe(0.0);
});

it('marks a receipt opened and lifts the campaign open rate', function () {
    $identity = Identity::factory()->create();
    $tenantId = Tenant::first()->id;
    sub('dev', ['identity_id' => $identity->id]);
    $campaign = PushCampaign::create(['title' => 'T', 'body' => 'B', 'status' => PushCampaignStatus::Sent, 'delivered_count' => 1]);
    PushReceipt::create(['push_campaign_id' => $campaign->id, 'device_token' => 'dev', 'delivered' => true]);

    Sanctum::actingAs($identity, ['identity'], 'identity');
    $this->postJson("/api/identity/churches/{$tenantId}/push/opened", ['campaign_id' => $campaign->id, 'device_token' => 'dev'])
        ->assertOk()->assertJsonPath('opened', true);

    expect(PushReceipt::first()->opened_at)->not->toBeNull();

    actingAsAdminWith(['manage_members']);
    $response = $this->getJson("/api/v1/admin/push/campaigns/{$campaign->id}")->assertOk();
    expect($response->json('data.opened_count'))->toBe(1)
        ->and((float) $response->json('data.open_rate'))->toBe(1.0);
});

it('rejects open tracking for a device the identity does not own', function () {
    $identity = Identity::factory()->create();
    $tenantId = Tenant::first()->id;
    Sanctum::actingAs($identity, ['identity'], 'identity');

    $this->postJson("/api/identity/churches/{$tenantId}/push/opened", ['campaign_id' => 1, 'device_token' => 'someone-else'])
        ->assertForbidden();
});

it('previews the audience for a segment', function () {
    actingAsAdminWith(['manage_members']);
    sub('news-1', ['topics' => ['news']]);
    sub('live-1', ['topics' => ['live']]);
    sub('news-muted', ['topics' => ['news'], 'muted' => true]);

    $this->getJson('/api/v1/admin/push/audience')->assertOk()->assertJsonPath('recipients', 2);
    $this->getJson('/api/v1/admin/push/audience?segment=news')->assertOk()->assertJsonPath('recipients', 1);
});
