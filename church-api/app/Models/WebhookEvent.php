<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Audit log of every inbound provider webhook (visualise + replay from admin).
 *
 * @property int $id
 * @property string $provider
 * @property string|null $event
 * @property string|null $reference
 * @property bool $signature_valid
 * @property string $status
 * @property array<string, mixed>|null $payload
 * @property string|null $error
 * @property Carbon|null $processed_at
 * @property Carbon $created_at
 */
class WebhookEvent extends Model
{
    protected $fillable = [
        'provider',
        'event',
        'reference',
        'signature_valid',
        'status',
        'payload',
        'error',
        'processed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'signature_valid' => 'boolean',
            'payload' => 'array',
            'processed_at' => 'datetime',
        ];
    }

    /**
     * @param  Builder<WebhookEvent>  $query
     */
    public function scopeLatestFirst(Builder $query): void
    {
        $query->orderByDesc('created_at')->orderByDesc('id');
    }
}
