<?php

namespace Database\Seeders;

use App\Enums\Feature;
use App\Models\Plan;
use Illuminate\Database\Seeder;

/**
 * The four shipped plans (central DB). Prices are minor units (cents) of USD;
 * annual billing bills 10 months. Run against central:
 *   php artisan db:seed --database=central --class="Database\Seeders\PlanSeeder"
 */
class PlanSeeder extends Seeder
{
    public function run(): void
    {
        $f = fn (Feature ...$features): array => array_map(fn (Feature $x): string => $x->value, $features);

        $plans = [
            [
                'code' => 'free',
                'name' => 'Assemblée',
                'price_month' => 0,
                'features' => [],
                'limits' => ['members' => 100, 'storage_gb' => 1, 'staff_seats' => 1, 'domains' => 0],
                'studio_included' => false,
                'sort_order' => 1,
            ],
            [
                'code' => 'starter',
                'name' => 'Paroisse',
                'price_month' => 1900,
                'features' => $f(Feature::CustomDomain, Feature::Store),
                'limits' => ['members' => 1000, 'storage_gb' => 10, 'staff_seats' => 5, 'domains' => 0],
                'studio_included' => false,
                'sort_order' => 2,
            ],
            [
                'code' => 'growth',
                'name' => 'Diocèse',
                'price_month' => 4900,
                'features' => $f(
                    Feature::CustomDomain, Feature::Store, Feature::Finances, Feature::Evangelism,
                    Feature::FollowUps, Feature::Teams, Feature::Resources, Feature::Live,
                ),
                'limits' => ['members' => null, 'storage_gb' => 50, 'staff_seats' => 20, 'domains' => 1],
                'studio_included' => false,
                'sort_order' => 3,
            ],
            [
                'code' => 'pro',
                'name' => 'Cathédrale',
                'price_month' => 9900,
                'features' => Feature::values(),
                'limits' => ['members' => null, 'storage_gb' => 200, 'staff_seats' => null, 'domains' => null],
                'studio_included' => true,
                'sort_order' => 4,
            ],
        ];

        foreach ($plans as $plan) {
            Plan::query()->updateOrCreate(
                ['code' => $plan['code']],
                [...$plan, 'price_year' => $plan['price_month'] * 10, 'currency' => 'USD', 'is_active' => true],
            );
        }
    }
}
