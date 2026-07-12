<?php

namespace Database\Factories;

use App\Enums\PushCampaignStatus;
use App\Models\PushCampaign;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PushCampaign>
 */
class PushCampaignFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(4),
            'body' => fake()->sentence(10),
            'data' => null,
            'segment' => null,
            'status' => PushCampaignStatus::Draft,
        ];
    }
}
