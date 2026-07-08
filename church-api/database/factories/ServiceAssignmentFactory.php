<?php

namespace Database\Factories;

use App\Models\Member;
use App\Models\Service;
use App\Models\ServiceAssignment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ServiceAssignment>
 */
class ServiceAssignmentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'service_id' => Service::factory(),
            'member_id' => Member::factory(),
            'team_id' => null,
            'role' => fake()->randomElement(['Chantre', 'Huissier', 'Prédicateur', 'Sonorisation', 'Accueil']),
            'status' => 'prevu',
            'notes' => null,
        ];
    }
}
