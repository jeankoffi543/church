<?php

namespace Database\Factories;

use App\Enums\MembershipStatus;
use App\Models\Identity;
use App\Models\Membership;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Membership>
 */
class MembershipFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'identity_id' => Identity::factory(),
            'tenant_id' => null,
            'local_member_id' => null,
            'status' => MembershipStatus::Follower,
            'is_public' => true,
            'claimed_at' => null,
        ];
    }

    /** A claimed membership (linked to a local member record). */
    public function claimed(int $localMemberId = 1): static
    {
        return $this->state([
            'status' => MembershipStatus::Member,
            'local_member_id' => $localMemberId,
            'claimed_at' => now(),
        ]);
    }

    /** A private membership (hidden from the church's follower list). */
    public function private(): static
    {
        return $this->state(['is_public' => false]);
    }
}
