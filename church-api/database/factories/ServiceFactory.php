<?php

namespace Database\Factories;

use App\Models\Service;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Service>
 */
class ServiceFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $type = fake()->randomElement(['culte_dominical', 'etude_biblique', 'veillee', 'culte_special']);

        return [
            'title' => null,
            'type' => $type,
            'date' => fake()->dateTimeBetween('-2 months', 'now')->format('Y-m-d'),
            'start_time' => fake()->randomElement(['09:00', '18:30', '22:00']),
            'notes' => null,
        ];
    }
}
