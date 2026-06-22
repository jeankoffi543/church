<?php

namespace Database\Factories;

use App\Enums\SermonMediaType;
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
            'media_type' => SermonMediaType::VideoUrl,
            'media_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'media_path' => null,
            'background_image' => null,
            'is_published' => true,
        ];
    }

    public function audioFile(): static
    {
        return $this->state(fn () => [
            'media_type' => SermonMediaType::AudioFile,
            'media_url' => null,
            'media_path' => '/storage/sermons/sample-audio.mp3',
        ]);
    }

    public function audioUrl(): static
    {
        return $this->state(fn () => [
            'media_type' => SermonMediaType::AudioUrl,
            'media_url' => 'https://soundcloud.com/example/sermon',
            'media_path' => null,
        ]);
    }

    public function unpublished(): static
    {
        return $this->state(fn () => ['is_published' => false]);
    }
}
