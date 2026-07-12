<?php

namespace App\Jobs;

use App\Enums\QueueName;
use App\Mail\DonationReceiptMail;
use App\Models\Donation;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;

/**
 * Asynchronously e-mail the official receipt to the donor once a gift is
 * confirmed by the Paystack webhook.
 */
class SendDonationReceipt implements ShouldQueue
{
    use Queueable;

    public function __construct(public Donation $donation)
    {
        $this->onQueue(QueueName::Mail->value);
    }

    public function handle(): void
    {
        Mail::to($this->donation->donor_email)->send(new DonationReceiptMail($this->donation));
    }
}
