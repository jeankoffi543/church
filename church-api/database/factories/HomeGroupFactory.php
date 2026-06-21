<?php

namespace Database\Factories;

use App\Models\HomeGroup;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<HomeGroup>
 */
class HomeGroupFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => 'Cellule '.fake()->unique()->firstName(),
            'leader' => fake()->name(),
            'address' => fake()->streetName(),
            'schedule' => fake()->dayOfWeek().' · 19h00',
            'coordinates' => ['top' => fake()->numberBetween(10, 90).'%', 'left' => fake()->numberBetween(10, 90).'%'],
            'sort_order' => fake()->numberBetween(0, 20),
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
