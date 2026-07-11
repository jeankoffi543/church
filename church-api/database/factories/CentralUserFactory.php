<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\CentralRole;
use App\Models\CentralUser;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<CentralUser>
 */
class CentralUserFactory extends Factory
{
    protected $model = CentralUser::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'password' => Hash::make('password'),
            'role' => CentralRole::SuperAdmin,
            'is_active' => true,
        ];
    }

    public function support(): static
    {
        return $this->state(fn (): array => ['role' => CentralRole::Support]);
    }
}
