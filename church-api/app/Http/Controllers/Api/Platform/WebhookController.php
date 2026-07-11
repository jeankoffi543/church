<?php

namespace App\Http\Controllers\Api\Platform;

use App\Http\Controllers\Controller;
use App\Services\PaystackBillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Receives Paystack billing events for platform subscriptions (central, no
 * tenancy). Authenticity is enforced by the HMAC-SHA512 signature; the event
 * then drives the tenant's subscription_status (CHR-141).
 */
class WebhookController extends Controller
{
    public function paystack(Request $request, PaystackBillingService $billing): JsonResponse
    {
        $payload = $request->getContent();

        if (! $billing->verifySignature($payload, $request->header('X-Paystack-Signature'))) {
            return response()->json(['message' => 'Invalid signature.'], 401);
        }

        $event = $request->input('event');
        $data = (array) $request->input('data', []);

        $status = $billing->applyEvent(is_string($event) ? $event : '', $data);

        // Always 200 once authenticated so Paystack stops retrying.
        return response()->json(['received' => true, 'status' => $status]);
    }
}
