<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A per-device delivery receipt for a push campaign (CHR-171, tenant DB). Written
 * by the fan-out; `opened_at` is stamped when the app reports an open.
 */
class PushReceipt extends Model
{
    protected $fillable = [
        'push_campaign_id',
        'device_token',
        'delivered',
        'opened_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'delivered' => 'boolean',
            'opened_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<PushCampaign, $this>
     */
    public function campaign(): BelongsTo
    {
        return $this->belongsTo(PushCampaign::class, 'push_campaign_id');
    }
}
