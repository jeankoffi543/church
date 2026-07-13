<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Async provisioning lifecycle of a tenant's database (CHR-173), tracked
 * separately from {@see TenantStatus}: a church signs up (Pending), the
 * ProvisionTenant job builds its database (Provisioning) and either finishes
 * (Ready) or errors out (Failed) — the signup wizard polls this to know when the
 * church can log in.
 *
 * A paid signup instead starts at AwaitingPayment (CHR-175): provisioning is
 * held until Paystack confirms the charge, at which point billing moves it to
 * Pending and dispatches the build.
 */
enum ProvisioningStatus: string
{
    case AwaitingPayment = 'awaiting_payment';
    case Pending = 'pending';
    case Provisioning = 'provisioning';
    case Ready = 'ready';
    case Failed = 'failed';

    /** No more transitions expected without operator action. */
    public function isTerminal(): bool
    {
        return $this === self::Ready || $this === self::Failed;
    }

    public function isReady(): bool
    {
        return $this === self::Ready;
    }
}
