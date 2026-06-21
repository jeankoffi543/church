<?php

namespace Database\Factories;

use App\Models\Event;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Event>
 */
class EventFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $title = fake()->unique()->sentence(3);
        $start = fake()->dateTimeBetween('now', '+3 months');

        return [
            'title' => $title,
            'slug' => Str::slug($title),
            'type' => fake()->randomElement(['Veillée', 'Culte', 'Séminaire', 'Conférence']),
            'description' => fake()->paragraph(),
            'location' => fake()->city(),
            'host' => fake()->name(),
            'starts_at' => $start,
            'ends_at' => (clone $start)->modify('+3 hours'),
            'image' => fake()->imageUrl(),
            'highlights' => fake()->sentences(3),
            'is_featured' => false,
        ];
    }

    public function featured(): static
    {
        return $this->state(fn () => ['is_featured' => true]);
    }
}
