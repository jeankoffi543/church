<?php

namespace Database\Factories;

use App\Enums\DonationFrequency;
use App\Enums\DonationStatus;
use App\Models\Donation;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Donation>
 */
class DonationFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $status = fake()->randomElement([
            DonationStatus::Success, DonationStatus::Success, DonationStatus::Success,
            DonationStatus::Pending, DonationStatus::Failed,
        ]);

        return [
            'reference' => 'DON-'.now()->year.'-'.strtoupper(Str::random(5)),
            'user_id' => null,
            'donor_name' => fake()->name(),
            'donor_email' => fake()->safeEmail(),
            'donor_phone' => fake()->optional()->numerify('+225 0# ## ## ## ##'),
            'purpose_key' => fake()->randomElement(['dime', 'offrande', 'projet', 'missions']),
            'amount' => fake()->randomElement([1000, 2000, 5000, 10000, 25000, 50000, 100000]),
            'currency' => 'XOF',
            'frequency' => fake()->randomElement([DonationFrequency::Unique, DonationFrequency::Mensuel]),
            'status' => $status,
            'channel' => $status === DonationStatus::Success ? fake()->randomElement(['mobile_money', 'card', 'bank']) : null,
            'paystack_reference' => null,
            'metadata' => null,
        ];
    }

    public function successful(): static
    {
        return $this->state(fn () => ['status' => DonationStatus::Success, 'channel' => 'mobile_money']);
    }
}
