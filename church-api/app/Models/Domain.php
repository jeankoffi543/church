<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\DomainType;
use App\Enums\SslStatus;
use Database\Factories\DomainFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Stancl\Tenancy\Database\Models\Domain as BaseDomain;

/**
 * A hostname that resolves to a tenant. Extends the stancl base model (central
 * connection, occupancy guard, lowercase normalisation) and adds the resolution
 * metadata introduced in CHR-134.
 */
class Domain extends BaseDomain
{
    /** @use HasFactory<DomainFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => DomainType::class,
            'ssl_status' => SslStatus::class,
            'is_primary' => 'boolean',
            'verified_at' => 'datetime',
        ];
    }
}
