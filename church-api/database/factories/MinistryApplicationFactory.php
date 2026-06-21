<?php

namespace Database\Factories;

use App\Enums\MinistryApplicationStatus;
use App\Models\Ministry;
use App\Models\MinistryApplication;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MinistryApplication>
 */
class MinistryApplicationFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => null,
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->numerify('+225 0# ## ## ## ##'),
            'ministry_id' => Ministry::factory(),
            'motivation' => fake()->paragraph(),
            'status' => MinistryApplicationStatus::Pending,
        ];
    }

    public function approved(): static
    {
        return $this->state(fn () => ['status' => MinistryApplicationStatus::Approved]);
    }

    public function rejected(): static
    {
        return $this->state(fn () => ['status' => MinistryApplicationStatus::Rejected]);
    }
}
