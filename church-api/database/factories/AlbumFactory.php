<?php

namespace Database\Factories;

use App\Models\Album;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Album>
 */
class AlbumFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $title = fake()->unique()->sentence(3);

        return [
            'title' => rtrim($title, '.'),
            'slug' => str()->slug($title).'-'.fake()->unique()->numberBetween(1, 99999),
            'description' => fake()->optional()->paragraph(),
            'event_id' => null,
            'cover_image' => 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80',
        ];
    }
}
