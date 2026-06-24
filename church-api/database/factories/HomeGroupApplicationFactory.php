<?php

namespace Database\Factories;

use App\Models\HomeGroup;
use App\Models\HomeGroupApplication;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<HomeGroupApplication>
 */
class HomeGroupApplicationFactory extends Factory
{
    protected $model = HomeGroupApplication::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->phoneNumber(),
            'home_group_id' => HomeGroup::factory(),
            'motivation' => fake()->paragraph(),
            'status' => fake()->randomElement(['pending', 'approved', 'rejected']),
            'processed_by' => User::factory(),
            'decision_note' => fake()->sentence(),
            'decision_note_public' => fake()->boolean(),
        ];
    }
}
