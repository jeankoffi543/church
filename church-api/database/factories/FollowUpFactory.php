<?php

namespace Database\Factories;

use App\Models\Convert;
use App\Models\FollowUp;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * @extends Factory<FollowUp>
 */
class FollowUpFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'followable_type' => 'convert',
            'followable_id' => Convert::factory(),
            'assigned_to' => null,
            'status' => 'nouveau',
            'next_action_date' => null,
        ];
    }

    public function forFollowable(Model $followable): static
    {
        return $this->state(fn () => [
            'followable_type' => $followable->getMorphClass(),
            'followable_id' => $followable->getKey(),
        ]);
    }
}
