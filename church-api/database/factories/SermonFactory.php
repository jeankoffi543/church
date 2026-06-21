<?php

namespace Database\Factories;

use App\Models\Sermon;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Sermon>
 */
class SermonFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'series' => fake()->randomElement(['Vivre par la foi', 'Prière', 'Fondations']),
            'title' => fake()->sentence(3),
            'description' => fake()->paragraph(),
            'speaker' => fake()->name(),
            'book' => fake()->randomElement(['Romains', 'Luc', 'Matthieu', 'Josué']),
            'preached_at' => fake()->dateTimeBetween('-6 months', 'now')->format('Y-m-d'),
            'duration' => fake()->numberBetween(35, 60).' min',
            'video_url' => fake()->url(),
            'audio_url' => fake()->url(),
            'is_published' => true,
        ];
    }

    public function unpublished(): static
    {
        return $this->state(fn () => ['is_published' => false]);
    }
}
