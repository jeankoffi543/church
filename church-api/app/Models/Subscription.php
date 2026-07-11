<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\SubscriptionStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Stancl\Tenancy\Database\Concerns\CentralConnection;

/**
 * Our mirror of a tenant's Paystack subscription (central DB). The billing
 * webhook drives its `status`, which is snapshotted onto `tenants.subscription_status`.
 */
class Subscription extends Model
{
    use CentralConnection;

    protected $fillable = [
        'tenant_id',
        'plan_id',
        'status',
        'paystack_customer_code',
        'paystack_subscription_code',
        'paystack_email_token',
        'authorization_url',
        'current_period_end',
        'cancel_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => SubscriptionStatus::class,
            'current_period_end' => 'datetime',
            'cancel_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }
}
