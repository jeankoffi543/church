<?php

namespace Database\Factories;

use App\Models\PastLive;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PastLive>
 */
class PastLiveFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $title = rtrim(fake()->unique()->sentence(4), '.');

        return [
            'title' => $title,
            'slug' => str()->slug($title).'-'.fake()->unique()->numberBetween(1, 99999),
            'description' => fake()->paragraph(),
            'youtube_id' => 'dQw4w9WgXcQ',
            'video_path' => null,
            'thumbnail_path' => 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1200&q=80',
            'series_name' => fake()->randomElement(['Vivre par la foi', 'Combats spirituels', 'Intimité', null]),
            'source_type' => fake()->randomElement(['live_archive', 'upload']),
            'preacher_id' => User::factory(),
            'views_count' => fake()->numberBetween(0, 5000),
            'duration' => fake()->numberBetween(28, 95).' min',
            'broadcasted_at' => fake()->dateTimeBetween('-1 year', 'now'),
        ];
    }
}
