<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\DomainType;
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
        ];
    }

    public function subdomain(string $slug): static
    {
        return $this->state(fn (): array => [
            'domain' => $slug.'.churchapp.io',
            'type' => DomainType::Subdomain,
            'is_primary' => true,
        ]);
    }
}
