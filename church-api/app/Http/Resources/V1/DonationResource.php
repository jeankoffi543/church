<?php

namespace App\Http\Resources\V1;

use App\Models\Donation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Donation
 */
class DonationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'donor_name' => $this->donor_name,
            'donor_email' => $this->donor_email,
            'donor_phone' => $this->donor_phone,
            'purpose_key' => $this->purpose_key,
            'amount' => $this->amount,
            'currency' => $this->currency,
            'frequency' => $this->frequency->value,
            'status' => $this->status->value,
            'channel' => $this->channel,
            'paystack_reference' => $this->paystack_reference,
            'created_at' => $this->created_at?->toIso8601String(),
            'date_label' => $this->created_at?->locale('fr')->translatedFormat('d M Y · H:i'),
        ];
    }
}
