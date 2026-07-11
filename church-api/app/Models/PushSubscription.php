<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Stancl\Tenancy\Database\Concerns\CentralConnection;

/**
 * A mobile device's push subscription to ONE church (central DB). The
 * fully-qualified push topics are derived from the tenant + the opted-in topics.
 */
class PushSubscription extends Model
{
    use CentralConnection;

    protected $fillable = [
        'device_token',
        'platform',
        'tenant_id',
        'topics',
    ];

    protected function casts(): array
    {
        return [
            'topics' => 'array',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * The provider topic names the device should be subscribed to (FCM/APNs),
     * scoped per tenant so a broadcast reaches only that church's followers.
     *
     * @return list<string>
     */
    public function topicNames(): array
    {
        return array_map(
            fn (string $topic): string => "tenant.{$this->tenant_id}.{$topic}",
            $this->topics ?? [],
        );
    }
}
