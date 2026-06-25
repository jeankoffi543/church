<?php

namespace Database\Factories;

use App\Models\BibleVerse;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BibleVerse>
 */
class BibleVerseFactory extends Factory
{
    protected $model = BibleVerse::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'book' => fake()->randomElement(['Jean', 'Psaumes', 'Romains', 'Matthieu']),
            'chapter' => fake()->numberBetween(1, 20),
            'verse' => fake()->numberBetween(1, 30),
            'text' => fake()->sentence(12),
            'translation' => 'LSG',
        ];
    }
}
