<?php

namespace Database\Factories;

use App\Models\Identity;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<Identity>
 */
class IdentityFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->optional()->e164PhoneNumber(),
            'password' => Hash::make('password'),
            'avatar_url' => null,
            'email_verified_at' => now(),
        ];
    }

    /** An identity that hasn't verified its e-mail yet. */
    public function unverified(): static
    {
        return $this->state(['email_verified_at' => null]);
    }
}
