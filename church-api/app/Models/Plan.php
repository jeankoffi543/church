<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\Feature;
use Illuminate\Database\Eloquent\Model;
use Stancl\Tenancy\Database\Concerns\CentralConnection;

/**
 * A subscription plan (central DB): the features and limits a tenant inherits.
 */
class Plan extends Model
{
    use CentralConnection;

    protected $fillable = [
        'code',
        'name',
        'price_month',
        'price_year',
        'currency',
        'features',
        'limits',
        'studio_included',
        'sort_order',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'features' => 'array',
            'limits' => 'array',
            'studio_included' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function hasFeature(string|Feature $feature): bool
    {
        $key = $feature instanceof Feature ? $feature->value : $feature;

        return in_array($key, $this->features ?? [], true);
    }
}
