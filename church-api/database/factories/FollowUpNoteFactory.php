<?php

namespace Database\Factories;

use App\Models\FollowUp;
use App\Models\FollowUpNote;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FollowUpNote>
 */
class FollowUpNoteFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'follow_up_id' => FollowUp::factory(),
            'action_type' => fake()->randomElement(['appel', 'visite', 'sms', 'whatsapp']),
            'note' => fake()->sentence(12),
            'created_by' => null,
        ];
    }
}
