<?php

namespace App\Http\Controllers\Api\V1\Webhooks;

use App\Actions\ApplyPaystackCharge;
use App\Http\Controllers\Controller;
use App\Models\WebhookEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaystackWebhookController extends Controller
{
    /**
     * Receive Paystack events. Every hit is logged (visualise + replay from the
     * admin); authenticity is enforced via the HMAC-SHA512 signature.
     */
    public function handle(Request $request, ApplyPaystackCharge $applyCharge): JsonResponse
    {
        $secret = config('services.paystack.secret_key');
        $signature = $request->header('X-Paystack-Signature');
        $payload = $request->getContent();

        $valid = is_string($secret) && $secret !== '' && is_string($signature)
            && hash_equals(hash_hmac('sha512', $payload, $secret), $signature);

        $event = $request->input('event');
        $data = (array) $request->input('data', []);
        $decoded = json_decode($payload, true);

        $log = WebhookEvent::create([
            'provider' => 'paystack',
            'event' => is_string($event) ? $event : null,
            'reference' => is_string($data['reference'] ?? null) ? $data['reference'] : null,
            'signature_valid' => $valid,
            'status' => 'received',
            'payload' => is_array($decoded) ? $decoded : ['raw' => $payload],
        ]);

        if (! $valid) {
            $log->update(['status' => 'invalid', 'error' => 'Invalid or missing signature.', 'processed_at' => now()]);

            return response()->json(['message' => 'Invalid signature.'], 401);
        }

        $status = $event === 'charge.success' ? $applyCharge($data) : 'ignored';
        $log->update(['status' => $status, 'processed_at' => now()]);

        // Always 200 so Paystack stops retrying once we have stored the event.
        return response()->json(['received' => true]);
    }
}
