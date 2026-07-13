<?php

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use Illuminate\Support\Facades\Http;

/*
| CHR-180 — a church's self-service billing: view the current plan + subscription
| status, and start / change a subscription through Paystack. Tenant context.
*/

it('shows the current plan, studio seats and the plan catalogue', function () {
    actingAsSuperAdmin();
    $free = Plan::query()->create(['code' => 'free', 'name' => 'Assemblée', 'features' => [], 'limits' => [], 'is_active' => true]);
    Plan::query()->create(['code' => 'growth', 'name' => 'Diocèse', 'features' => ['store'], 'limits' => [], 'price_month' => 4900, 'currency' => 'USD', 'is_active' => true]);
    Tenant::query()->firstOrFail()->update(['plan_id' => $free->id, 'studio_enabled' => true, 'studio_seats' => 3]);

    $this->getJson('http://localhost/api/v1/admin/billing')
        ->assertOk()
        ->assertJsonPath('data.plan.code', 'free')
        ->assertJsonPath('data.studio.enabled', true)
        ->assertJsonPath('data.studio.seats', 3)
        ->assertJsonPath('data.studio.used', 0)
        ->assertJsonStructure(['data' => ['plan', 'subscription_status', 'features', 'studio' => ['enabled', 'seats', 'used'], 'plans']]);
});

it('starts a subscription and returns the Paystack checkout url', function () {
    config(['services.paystack.platform_secret_key' => 'test-secret']);
    Http::fake(['api.paystack.co/*' => Http::response(['status' => true, 'data' => [
        'authorization_url' => 'https://checkout.paystack.co/abc',
        'customer' => ['customer_code' => 'CUS_1'],
    ]])]);

    actingAsSuperAdmin();
    Plan::query()->create(['code' => 'growth', 'name' => 'Diocèse', 'features' => ['store'], 'limits' => [], 'price_month' => 4900, 'currency' => 'USD', 'is_active' => true]);

    $this->postJson('http://localhost/api/v1/admin/billing/subscribe', ['plan_code' => 'growth', 'email' => 'pay@church.test'])
        ->assertOk()
        ->assertJsonPath('authorization_url', 'https://checkout.paystack.co/abc')
        ->assertJsonPath('plan_code', 'growth');

    expect(Subscription::query()->where('tenant_id', Tenant::query()->value('id'))->exists())->toBeTrue();
});

it('gates billing behind manage_settings', function () {
    actingAsAdminWith([]);

    $this->getJson('http://localhost/api/v1/admin/billing')->assertForbidden();
});
