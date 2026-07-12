<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PushCampaignStatus;
use Database\Factories\PushCampaignFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * A church's push campaign (CHR-170), in the tenant DB. Fans out to the church's
 * subscribers in the central registry; delivery counts are written back here.
 */
class PushCampaign extends Model
{
    /** @use HasFactory<PushCampaignFactory> */
    use HasFactory;

    protected $fillable = [
        'title',
        'body',
        'data',
        'segment',
        'status',
        'recipients_count',
        'delivered_count',
        'failed_count',
        'sent_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'data' => 'array',
            'status' => PushCampaignStatus::class,
            'sent_at' => 'datetime',
        ];
    }
}
