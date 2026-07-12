<?php

declare(strict_types=1);

namespace App\Enums;

/** A church's push campaign lifecycle (CHR-170). */
enum PushCampaignStatus: string
{
    case Draft = 'draft';
    case Sending = 'sending';
    case Sent = 'sent';
}
