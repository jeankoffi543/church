<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Stancl\Tenancy\Database\Concerns\CentralConnection;

/**
 * One line of the landlord audit trail (central DB). Append-only: it carries a
 * single `created_at` and is never updated.
 */
class TenantAudit extends Model
{
    use CentralConnection;

    public $timestamps = false;

    protected $table = 'tenant_audit';

    protected $fillable = [
        'central_user_id',
        'tenant_id',
        'action',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
            'created_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (TenantAudit $audit): void {
            $audit->created_at ??= now();
        });
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(CentralUser::class, 'central_user_id');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
