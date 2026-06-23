<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Enums\DonationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Public\DonationRequest;
use App\Models\Donation;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class DonationController extends Controller
{
    /**
     * Open a transaction: create the immutable `pending` ledger row and return
     * the keys the Paystack inline popup needs (public key + our reference).
     */
    public function initialize(DonationRequest $request): JsonResponse
    {
        $data = $request->validated();

        $donation = Donation::create([
            'reference' => $this->uniqueReference(),
            'user_id' => $request->user()?->id,
            'donor_name' => $data['donor_name'],
            'donor_email' => $data['donor_email'],
            'donor_phone' => $data['donor_phone'] ?? null,
            'purpose_key' => $data['purpose_key'],
            'amount' => $data['amount'],
            'currency' => $data['currency'] ?? config('services.paystack.currency', 'XOF'),
            'frequency' => $data['frequency'],
            'status' => DonationStatus::Pending->value,
        ]);

        return response()->json([
            'data' => [
                'reference' => $donation->reference,
                'public_key' => config('services.paystack.public_key'),
                'email' => $donation->donor_email,
                'amount' => $donation->amount,
                'currency' => $donation->currency,
                'purpose_key' => $donation->purpose_key,
            ],
        ], 201);
    }

    /**
     * Poll the accounting status of a transaction (the client waits for the
     * webhook to flip it to `success`).
     */
    public function status(string $reference): JsonResponse
    {
        $donation = Donation::query()->where('reference', $reference)->firstOrFail();

        return response()->json([
            'data' => [
                'reference' => $donation->reference,
                'status' => $donation->status->value,
                'amount' => $donation->amount,
                'currency' => $donation->currency,
                'purpose_key' => $donation->purpose_key,
            ],
        ]);
    }

    private function uniqueReference(): string
    {
        do {
            $reference = 'DON-'.now()->year.'-'.strtoupper(Str::random(5));
        } while (Donation::query()->where('reference', $reference)->exists());

        return $reference;
    }
}
