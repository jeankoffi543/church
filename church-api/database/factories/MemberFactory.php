<?php

namespace Database\Factories;

use App\Models\Member;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Member>
 */
class MemberFactory extends Factory
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
            'gender' => fake()->randomElement(['homme', 'femme']),
            'birthdate' => fake()->optional()->dateTimeBetween('-70 years', '-5 years')?->format('Y-m-d'),
            'address' => fake()->optional()->address(),
            'marital_status' => fake()->randomElement(['celibataire', 'marie', 'veuf', 'divorce']),
            'join_date' => fake()->dateTimeBetween('-5 years', 'now')->format('Y-m-d'),
            'member_type' => fake()->randomElement(['visiteur', 'membre', 'membre', 'membre', 'leader']),
            'home_group_id' => null,
            'status' => 'actif',
            'photo' => null,
            'notes' => null,
        ];
    }
}
