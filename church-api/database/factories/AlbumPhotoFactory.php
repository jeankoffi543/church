<?php

namespace Database\Factories;

use App\Models\Album;
use App\Models\AlbumPhoto;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AlbumPhoto>
 */
class AlbumPhotoFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'album_id' => Album::factory(),
            'image_path' => 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=1400&q=80',
            'order' => fake()->numberBetween(0, 50),
        ];
    }
}
