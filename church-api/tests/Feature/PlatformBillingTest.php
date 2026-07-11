<?php

use App\Enums\SubscriptionStatus;
use App\Models\CentralUser;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;

/*
| CHR-141 — platform billing: starting a subscription (Paystack checkout) and
| the webhook state machine that drives `tenants.subscription_status`.
*/

function postBillingWebhook(array $payload): TestResponse
{
    config(['services.paystack.platform_secret_key' => 'test-platform-secret']);

    $body = json_encode($payload);
    $signature = hash_hmac('sha512', $body, 'test-platform-secret');

    return test()->call('POST', '/api/platform/webhooks/paystack', [], [], [], [
        'HTTP_X_PAYSTACK_SIGNATURE' => $signature,
        'CONTENT_TYPE' => 'application/json',
        'HTTP_ACCEPT' => 'application/json',
    ], $body);
}

function seedSubscription(string $code = 'SUB_test', SubscriptionStatus $status = SubscriptionStatus::Trialing): Subscription
{
    $tenant = Tenant::query()->firstOrFail();
    $plan = Plan::query()->firstOrCreate(
        ['code' => 'growth'],
        ['name' => 'Diocèse', 'features' => [], 'limits' => [], 'price_month' => 4900, 'currency' => 'USD'],
    );

    return Subscription::query()->create([
        'tenant_id' => $tenant->id,
        'plan_id' => $plan->id,
        'status' => $status,
        'paystack_subscription_code' => $code,
    ]);
}

it('starts a subscription and returns the Paystack checkout URL', function () {
    Http::fake(['api.paystack.co/*' => Http::response(['status' => true, 'data' => [
        'authorization_url' => 'https://checkout.paystack.co/abc',
        'reference' => 'ref_1',
        'customer' => ['customer_code' => 'CUS_1'],
    ]])]);

    $plan = Plan::query()->create(['code' => 'growth', 'name' => 'Diocèse', 'features' => [], 'limits' => [], 'price_month' => 4900, 'currency' => 'USD']);
    $tenant = Tenant::query()->firstOrFail();
    $token = CentralUser::factory()->create()->createToken('t', ['platform'])->plainTextToken;

    $this->withToken($token)
        ->postJson("/api/platform/tenants/{$tenant->id}/subscribe", ['plan_code' => 'growth', 'email' => 'billing@church.test'])
        ->assertOk()
        ->assertJsonPath('authorization_url', 'https://checkout.paystack.co/abc')
        ->assertJsonPath('subscription.status', 'trialing');

    expect(Subscription::query()->where('tenant_id', $tenant->id)->where('plan_id', $plan->id)->exists())->toBeTrue();
});

it('rejects a billing webhook with a bad signature', function () {
    config(['services.paystack.platform_secret_key' => 'test-platform-secret']);

    $this->postJson('/api/platform/webhooks/paystack', ['event' => 'charge.success', 'data' => []])
        ->assertUnauthorized();
});

it('activates the tenant subscription on a successful charge', function () {
    $subscription = seedSubscription();

    postBillingWebhook([
        'event' => 'charge.success',
        'data' => [
            'subscription_code' => 'SUB_test',
            'customer' => ['customer_code' => 'CUS_1'],
            'metadata' => ['tenant_id' => $subscription->tenant_id],
        ],
    ])->assertOk()->assertJsonPath('status', 'active');

    $tenant = Tenant::query()->firstOrFail();

    expect($tenant->subscription_status)->toBe(SubscriptionStatus::Active)
        ->and($tenant->plan_id)->toBe($subscription->plan_id)
        ->and($subscription->refresh()->status)->toBe(SubscriptionStatus::Active);
});

it('marks the subscription past_due on a failed invoice', function () {
    seedSubscription('SUB_pd', SubscriptionStatus::Active);

    postBillingWebhook([
        'event' => 'invoice.payment_failed',
        'data' => ['subscription' => ['subscription_code' => 'SUB_pd']],
    ])->assertOk();

    expect(Tenant::query()->firstOrFail()->subscription_status)->toBe(SubscriptionStatus::PastDue);
});

it('suspends the tenant when the subscription is disabled, blocking its API', function () {
    seedSubscription('SUB_off', SubscriptionStatus::Active);

    postBillingWebhook([
        'event' => 'subscription.disable',
        'data' => ['subscription_code' => 'SUB_off'],
    ])->assertOk();

    expect(Tenant::query()->firstOrFail()->subscription_status)->toBe(SubscriptionStatus::Suspended);

    // CHR-137's guard now turns the church away.
    $this->getJson('http://localhost/api/v1/public/settings')->assertForbidden();
});
