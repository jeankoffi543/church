<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property string $code
 * @property string $symbol
 * @property float $exchange_rate
 * @property bool $is_default
 * @property bool $is_active
 */
class Currency extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'symbol',
        'exchange_rate',
        'is_default',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'exchange_rate' => 'float',
            'is_default' => 'boolean',
            'is_active' => 'boolean',
        ];
    }
}
