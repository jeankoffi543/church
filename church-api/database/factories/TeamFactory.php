<?php

namespace Database\Factories;

use App\Models\Team;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Team>
 */
class TeamFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->randomElement(['Louange & Adoration', 'Protocole', 'Média & Régie', 'Prédication', 'Sécurité', 'Accueil']),
            'description' => null,
            'is_active' => true,
        ];
    }
}
