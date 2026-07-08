<?php

namespace Database\Factories;

use App\Models\EvangelismCampaign;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EvangelismCampaign>
 */
class EvangelismCampaignFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => 'Sortie évangélisation '.fake()->city(),
            'date' => fake()->dateTimeBetween('-6 months', 'now')->format('Y-m-d'),
            'location' => fake()->streetAddress(),
            'notes' => null,
        ];
    }
}
