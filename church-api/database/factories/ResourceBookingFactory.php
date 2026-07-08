<?php

namespace Database\Factories;

use App\Models\Resource;
use App\Models\ResourceBooking;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ResourceBooking>
 */
class ResourceBookingFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $start = fake()->dateTimeBetween('now', '+2 months');

        return [
            'resource_id' => Resource::factory(),
            'title' => fake()->randomElement(['Culte dominical', 'Réunion de prière', 'Sortie évangélisation', 'Retraite spirituelle']),
            'starts_at' => $start,
            'ends_at' => (clone $start)->modify('+2 hours'),
            'booked_by' => null,
            'notes' => null,
            'status' => 'confirme',
        ];
    }
}
