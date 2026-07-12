<?php

namespace Database\Factories;

use App\Models\DatabaseServer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DatabaseServer>
 */
class DatabaseServerFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => 'shard-'.fake()->unique()->numberBetween(1, 99999),
            'connection' => 'mysql',
            'host' => fake()->localIpv4(),
            'port' => 3306,
            'username' => 'church',
            'password' => 'secret',
            'is_active' => true,
            'max_tenants' => null,
            'weight' => 1,
            'notes' => null,
        ];
    }

    /** A server closed to new tenants. */
    public function inactive(): static
    {
        return $this->state(['is_active' => false]);
    }

    /** A server with a capacity cap (defaults to already full). */
    public function withCapacity(int $max): static
    {
        return $this->state(['max_tenants' => $max]);
    }

    /** A server that has a read replica (read/write split). */
    public function withReadReplica(?string $host = null): static
    {
        return $this->state(fn (array $attributes) => [
            'read_host' => $host ?? 'replica-'.($attributes['host'] ?? fake()->localIpv4()),
        ]);
    }
}
