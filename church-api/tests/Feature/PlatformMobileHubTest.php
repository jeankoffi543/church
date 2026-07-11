<?php

use App\Enums\TenantStatus;
use App\Models\PushSubscription;
use App\Models\Tenant;

/*
| CHR-149 — mobile Hub foundations: church discovery + the per-tenant push
| registry. (The global beforeEach maps localhost to an active "Test Church".)
*/

it('discovers active churches by name', function () {
    $this->getJson('/api/platform/tenants/search?q=test')
        ->assertOk()
        ->assertJsonStructure(['data' => [['id', 'name', 'slug', 'domain']]])
        ->assertJsonPath('data.0.name', 'Test Church')
        ->assertJsonPath('data.0.domain', 'localhost');
});

it('excludes suspended churches from discovery', function () {
    Tenant::query()->firstOrFail()->update(['status' => TenantStatus::Suspended]);

    $this->getJson('/api/platform/tenants/search')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

it('subscribes a device to a church push topics', function () {
    $tenant = Tenant::query()->firstOrFail();

    $this->postJson('/api/platform/push/subscribe', [
        'device_token' => 'dev-abc',
        'platform' => 'android',
        'tenant_id' => $tenant->id,
        'topics' => ['news', 'events'],
    ])
        ->assertCreated()
        ->assertJsonPath('data.tenant_id', $tenant->id)
        ->assertJsonPath('data.topics', ['news', 'events'])
        ->assertJsonPath('data.topic_names.0', "tenant.{$tenant->id}.news");

    expect(PushSubscription::query()->where('device_token', 'dev-abc')->where('tenant_id', $tenant->id)->exists())->toBeTrue();
});

it('defaults to news + live topics', function () {
    $tenant = Tenant::query()->firstOrFail();

    $this->postJson('/api/platform/push/subscribe', ['device_token' => 'dev-x', 'tenant_id' => $tenant->id])
        ->assertCreated()
        ->assertJsonPath('data.topics', ['news', 'live']);
});

it('rejects a subscribe to an unknown church', function () {
    $this->postJson('/api/platform/push/subscribe', ['device_token' => 'dev-x', 'tenant_id' => 'does-not-exist'])
        ->assertStatus(422);
});

it('lists a device subscriptions then unsubscribes', function () {
    $tenant = Tenant::query()->firstOrFail();

    $this->postJson('/api/platform/push/subscribe', ['device_token' => 'dev-1', 'tenant_id' => $tenant->id])->assertCreated();

    $this->getJson('/api/platform/push/subscriptions?device_token=dev-1')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.tenant_name', 'Test Church');

    $this->postJson('/api/platform/push/unsubscribe', ['device_token' => 'dev-1', 'tenant_id' => $tenant->id])->assertOk();

    expect(PushSubscription::query()->where('device_token', 'dev-1')->count())->toBe(0);
});
