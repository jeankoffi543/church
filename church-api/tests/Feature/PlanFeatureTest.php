<?php

use App\Enums\Feature;
use App\Models\Plan;
use App\Models\Tenant;
use Database\Seeders\PlanSeeder;
use Stancl\Tenancy\Events\TenantCreated;

/*
| CHR-140 — plans + feature-flipping: a tenant's active features come from its
| plan (with per-tenant overrides), and premium routes are gated behind them.
*/

it('resolves features from the plan, with per-tenant overrides winning', function () {
    Event::fake([TenantCreated::class]);

    $plan = Plan::create([
        'code' => 'test-growth',
        'name' => 'Test Growth',
        'features' => [Feature::Store->value, Feature::Finances->value],
        'limits' => [],
    ]);

    $tenant = Tenant::factory()->create([
        'plan_id' => $plan->id,
        'features' => ['store' => false, 'evangelism' => true], // overrides
    ]);

    expect($tenant->hasFeature(Feature::Finances))->toBeTrue()   // from plan
        ->and($tenant->hasFeature(Feature::Store))->toBeFalse()  // override false beats the plan
        ->and($tenant->hasFeature(Feature::Evangelism))->toBeTrue() // override true, not in plan
        ->and($tenant->hasFeature(Feature::Studio))->toBeFalse() // neither
        ->and($tenant->activeFeatures())->toContain('finances', 'evangelism')->not->toContain('store', 'studio');
});

it('gates a premium module behind its feature flag', function () {
    actingAsSuperAdmin(); // a church admin passes every permission via Gate::before

    // Disable evangelism on the resolved (localhost) tenant.
    Tenant::query()->firstOrFail()->update(['features' => ['evangelism' => false]]);

    // Permission is satisfied, but the feature isn't → 403 from `feature:evangelism`.
    $this->getJson('http://localhost/api/v1/admin/evangelism-campaigns')->assertForbidden();
    // (The enabled case is covered by the existing evangelism tests, which run
    // with every feature turned on.)
});

it('exposes the active features on the admin profile', function () {
    Tenant::query()->firstOrFail()->update(['features' => ['store' => true, 'finances' => true]]);
    actingAsSuperAdmin();

    $response = $this->getJson('http://localhost/api/v1/admin/me')->assertOk();

    expect($response->json('features'))
        ->toContain('store', 'finances')
        ->not->toContain('evangelism', 'studio');
});

it('seeds four tiered plans', function () {
    $this->seed(PlanSeeder::class);

    expect(Plan::query()->count())->toBe(4)
        ->and(Plan::query()->where('code', 'free')->value('features'))->toBe([])
        ->and(Plan::query()->where('code', 'starter')->first()->hasFeature(Feature::Studio))->toBeFalse()
        ->and(Plan::query()->where('code', 'growth')->first()->hasFeature(Feature::Finances))->toBeTrue()
        ->and(Plan::query()->where('code', 'pro')->first()->hasFeature(Feature::Studio))->toBeTrue();
});
