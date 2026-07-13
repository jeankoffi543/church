<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\DomainStatus;
use App\Enums\DomainType;
use App\Enums\SslStatus;
use App\Models\Domain;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Domain>
 *
 * Callers supply the tenant, e.g. Domain::factory()->for($tenant) or
 * $tenant->domains()->save(Domain::factory()->make()).
 */
class DomainFactory extends Factory
{
    protected $model = Domain::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'domain' => fake()->unique()->domainName(),
            'type' => DomainType::Custom,
            'is_primary' => false,
            'status' => DomainStatus::Pending,
        ];
    }

    public function subdomain(string $slug): static
    {
        return $this->state(fn (): array => [
            'domain' => $slug.'.churchapp.io',
            'type' => DomainType::Subdomain,
            'is_primary' => true,
            'status' => DomainStatus::Active,
            'verified_at' => now(),
            'ssl_status' => SslStatus::Issued,
        ]);
    }

    /** A custom domain whose ownership has been verified but not yet activated. */
    public function verified(): static
    {
        return $this->state(fn (): array => [
            'status' => DomainStatus::Verified,
            'verified_at' => now(),
            'ssl_status' => SslStatus::Issued,
            'verification_token' => 'chr_'.fake()->lexify('????????'),
        ]);
    }
}
