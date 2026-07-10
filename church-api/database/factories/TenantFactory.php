<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\SubscriptionStatus;
use App\Enums\TenantStatus;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Tenant>
 */
class TenantFactory extends Factory
{
    protected $model = Tenant::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->company();

        return [
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(4)),
            'subscription_status' => SubscriptionStatus::Trialing,
            'trial_ends_at' => now()->addDays(14),
            'features' => [],
            'studio_enabled' => false,
            'studio_seats' => 0,
            'status' => TenantStatus::Active,
        ];
    }

    /**
     * A tenant whose plan unlocks the Studio Live desktop app.
     */
    public function withStudio(int $seats = 2): static
    {
        return $this->state(fn (): array => [
            'studio_enabled' => true,
            'studio_seats' => $seats,
        ]);
    }
}
