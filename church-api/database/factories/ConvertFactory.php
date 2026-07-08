<?php

namespace Database\Factories;

use App\Models\Convert;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Convert>
 */
class ConvertFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'phone' => fake()->optional()->numerify('+225 0# ## ## ## ##'),
            'email' => fake()->optional()->safeEmail(),
            'decision_type' => fake()->randomElement(['nouvelle_conversion', 'reengagement']),
            'decision_date' => fake()->dateTimeBetween('-6 months', 'now')->format('Y-m-d'),
            'service_id' => null,
            'evangelism_campaign_id' => null,
            'assigned_counselor_id' => null,
            'status' => 'nouveau',
            'notes' => null,
        ];
    }
}
