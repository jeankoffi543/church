<?php

namespace Database\Factories;

use App\Models\Resource;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<resource>
 */
class ResourceFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->randomElement(['Sonorisation principale', 'Bus 30 places', 'Salle de réunion A', 'Vidéoprojecteur', 'Groupe électrogène']),
            'type' => fake()->randomElement(['salle', 'vehicule', 'materiel']),
            'description' => null,
            'location' => fake()->optional()->streetAddress(),
            'condition' => 'bon',
            'is_active' => true,
        ];
    }
}
