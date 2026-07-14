<?php

use App\Models\CentralUser;
use App\Models\Plan;
use App\Models\Tenant;
use Stancl\Tenancy\Events\TenantCreated;

/*
| CHR-196 — owner-customizable subscription plans: super-admin CRUD over the
| central `plans` catalogue, gated by auth:central + super-admin.
*/

function planSuperToken(bool $super = true): string
{
    $user = $super ? CentralUser::factory()->create() : CentralUser::factory()->support()->create();

    return $user->createToken('t', ['platform'])->plainTextToken;
}

/**
 * @return array<string, mixed>
 */
function planPayload(array $overrides = []): array
{
    return array_merge([
        'code' => 'basic',
        'name' => 'Basique',
        'price_month' => 1500,
        'price_year' => 15000,
        'currency' => 'USD',
        'features' => ['store', 'live'],
        'limits' => ['members' => 500, 'storage_gb' => 10, 'staff_seats' => 3],
        'studio_included' => false,
        'sort_order' => 2,
        'is_active' => true,
    ], $overrides);
}

it('gates plan management behind a central super-admin', function () {
    $this->getJson('/api/platform/plans/manage')->assertUnauthorized();
    $this->postJson('/api/platform/plans', planPayload())->assertUnauthorized();

    $support = planSuperToken(super: false);
    $this->withToken($support)->getJson('/api/platform/plans/manage')->assertForbidden();
    $this->withToken($support)->postJson('/api/platform/plans', planPayload())->assertForbidden();
});

it('lists every plan, including inactive ones, for the console', function () {
    Plan::query()->create(['code' => 'free', 'name' => 'Free', 'features' => [], 'limits' => [], 'sort_order' => 1]);
    Plan::query()->create(['code' => 'legacy', 'name' => 'Legacy', 'features' => [], 'limits' => [], 'sort_order' => 2, 'is_active' => false]);

    $this->withToken(planSuperToken())
        ->getJson('/api/platform/plans/manage')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.code', 'free')
        ->assertJsonPath('data.1.code', 'legacy')
        ->assertJsonPath('data.1.is_active', false)
        ->assertJsonStructure(['data' => [['id', 'code', 'name', 'price_month', 'price_year', 'currency', 'paystack_plan_code', 'features', 'limits', 'studio_included', 'sort_order', 'is_active']]]);
});

it('creates a plan with a validated feature set', function () {
    $this->withToken(planSuperToken())
        ->postJson('/api/platform/plans', planPayload(['code' => 'pro-plus', 'features' => ['store', 'live', 'finances']]))
        ->assertCreated()
        ->assertJsonPath('data.code', 'pro-plus')
        ->assertJsonPath('data.currency', 'USD')
        ->assertJsonPath('data.features', ['store', 'live', 'finances']);

    $plan = Plan::query()->where('code', 'pro-plus')->firstOrFail();
    expect($plan->hasFeature('finances'))->toBeTrue()
        ->and($plan->limits['members'])->toBe(500);
});

it('rejects unknown features and duplicate codes', function () {
    Plan::query()->create(['code' => 'starter', 'name' => 'Starter', 'features' => [], 'limits' => []]);
    $token = planSuperToken();

    $this->withToken($token)
        ->postJson('/api/platform/plans', planPayload(['code' => 'x', 'features' => ['store', 'not_a_feature']]))
        ->assertStatus(422)
        ->assertJsonValidationErrors('features.1');

    $this->withToken($token)
        ->postJson('/api/platform/plans', planPayload(['code' => 'starter']))
        ->assertStatus(422)
        ->assertJsonValidationErrors('code');
});

it('updates a plan and keeps its own code on unique check', function () {
    $plan = Plan::query()->create(planPayload(['code' => 'growth', 'name' => 'Growth']));

    $this->withToken(planSuperToken())
        ->putJson("/api/platform/plans/{$plan->getKey()}", planPayload([
            'code' => 'growth', // unchanged code must not trip the unique rule
            'name' => 'Growth Plus',
            'price_month' => 4900,
            'features' => ['store', 'live', 'teams'],
        ]))
        ->assertOk()
        ->assertJsonPath('data.name', 'Growth Plus')
        ->assertJsonPath('data.price_month', 4900);

    expect($plan->refresh()->hasFeature('teams'))->toBeTrue();
});

it('deactivates a plan so the public catalogue hides it', function () {
    $plan = Plan::query()->create(planPayload(['code' => 'to-retire']));

    $this->withToken(planSuperToken())
        ->putJson("/api/platform/plans/{$plan->getKey()}", planPayload(['code' => 'to-retire', 'is_active' => false]))
        ->assertOk()
        ->assertJsonPath('data.is_active', false);

    $this->getJson('/api/platform/plans')->assertOk()->assertJsonMissing(['code' => 'to-retire']);
});

it('refuses to delete a plan still used by a church, but deletes an unused one', function () {
    Event::fake([TenantCreated::class]);
    $used = Plan::query()->create(planPayload(['code' => 'used']));
    $unused = Plan::query()->create(planPayload(['code' => 'unused']));
    Tenant::factory()->create(['plan_id' => $used->getKey()]);

    $token = planSuperToken();

    $this->withToken($token)
        ->deleteJson("/api/platform/plans/{$used->getKey()}")
        ->assertStatus(422);
    expect(Plan::query()->whereKey($used->getKey())->exists())->toBeTrue();

    $this->withToken($token)
        ->deleteJson("/api/platform/plans/{$unused->getKey()}")
        ->assertOk();
    expect(Plan::query()->whereKey($unused->getKey())->exists())->toBeFalse();
});
