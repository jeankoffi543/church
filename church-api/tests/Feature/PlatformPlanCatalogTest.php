<?php

use App\Models\Plan;
use Database\Seeders\PlanSeeder;

/*
| CHR-146 — the public plan catalogue behind the SaaS marketing pricing page.
*/

it('lists active plans, ordered, publicly', function () {
    $this->seed(PlanSeeder::class);

    $this->getJson('/api/platform/plans')
        ->assertOk()
        ->assertJsonCount(4, 'data')
        ->assertJsonPath('data.0.code', 'free')
        ->assertJsonPath('data.3.code', 'pro')
        ->assertJsonPath('data.3.studio_included', true)
        ->assertJsonStructure(['data' => [['code', 'name', 'price_month', 'currency', 'features', 'limits']]]);
});

it('hides inactive plans', function () {
    Plan::query()->create(['code' => 'legacy', 'name' => 'Legacy', 'features' => [], 'limits' => [], 'is_active' => false]);

    $this->getJson('/api/platform/plans')
        ->assertOk()
        ->assertJsonMissing(['code' => 'legacy']);
});
