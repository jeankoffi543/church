<?php

namespace Database\Factories;

use App\Models\Attendance;
use App\Models\Service;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Attendance>
 */
class AttendanceFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'service_id' => Service::factory(),
            'category' => fake()->randomElement(['hommes', 'femmes', 'enfants', 'visiteurs']),
            'count' => fake()->numberBetween(10, 200),
            'recorded_by_id' => null,
        ];
    }
}
