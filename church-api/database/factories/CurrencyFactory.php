<?php

namespace Database\Factories;

use App\Models\Currency;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Currency>
 */
class CurrencyFactory extends Factory
{
    protected $model = Currency::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => fake()->unique()->currencyCode(),
            'symbol' => fake()->randomElement(['$', '€', '£', '¥']),
            'exchange_rate' => 1.000000,
            'is_default' => false,
            'is_active' => true,
        ];
    }
}
