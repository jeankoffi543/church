<?php

namespace Database\Factories;

use App\Models\OfferingCollection;
use App\Models\Service;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OfferingCollection>
 */
class OfferingCollectionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'service_id' => Service::factory(),
            'nature' => fake()->randomElement(['dime', 'offrande', 'projet', 'missions']),
            'amount' => fake()->randomElement([15000, 25000, 40000, 60000, 100000]),
            'currency' => 'XOF',
            'counted_by_id' => null,
            'notes' => null,
        ];
    }
}
