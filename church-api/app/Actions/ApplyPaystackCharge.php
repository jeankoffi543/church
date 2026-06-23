<?php

namespace App\Actions;

use App\Enums\DonationStatus;
use App\Jobs\SendDonationReceipt;
use App\Models\Donation;

/**
 * Reconcile a Paystack `charge.success` payload against the donations ledger.
 * Shared by the live webhook and the admin "replay" so both behave identically.
 */
class ApplyPaystackCharge
{
    /**
     * @param  array<string, mixed>  $data
     * @return 'processed'|'ignored' Whether a donation was reconciled.
     */
    public function __invoke(array $data, bool $force = false): string
    {
        $reference = $data['reference'] ?? null;
        if (! is_string($reference)) {
            return 'ignored';
        }

        $donation = Donation::query()->where('reference', $reference)->first();
        if ($donation === null) {
            return 'ignored';
        }

        // Idempotent unless an admin explicitly forces a replay.
        if (! $force && $donation->status === DonationStatus::Success) {
            return 'ignored';
        }

        $donation->update([
            'status' => DonationStatus::Success->value,
            'channel' => $data['channel'] ?? $donation->channel,
            'paystack_reference' => $reference,
            'metadata' => $data,
        ]);

        SendDonationReceipt::dispatch($donation);

        return 'processed';
    }
}
