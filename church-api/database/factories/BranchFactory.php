<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Branch>
 */
class BranchFactory extends Factory
{
    protected $model = Branch::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $title = 'Extension '.fake()->unique()->city();

        return [
            'title' => $title,
            'slug' => Str::slug($title),
            'description' => fake()->paragraph(),
            'address' => fake()->address(),
            'phone' => fake()->phoneNumber(),
            'hours' => 'Dimanche '.fake()->randomElement(['08h00', '09h00', '10h00']).' · '.fake()->randomElement(['Mardi', 'Mercredi', 'Jeudi']).' 18h30',
            'lat' => fake()->latitude(5.25, 5.45),
            'lng' => fake()->longitude(-4.10, -3.90),
            'website' => fake()->optional()->url(),
            'pastor_id' => User::factory(),
        ];
    }
}
