<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\ProvisioningStatus;
use App\Enums\SubscriptionStatus;
use App\Jobs\ProvisionTenant;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;

/**
 * Platform subscription billing (CHR-141). Talks to the SaaS's own Paystack
 * account to charge churches for their plan, and maps Paystack webhook events
 * onto our {@see Subscription} mirror + the tenant's `subscription_status`.
 */
class PaystackBillingService
{
    public function secret(): ?string
    {
        $secret = config('services.paystack.platform_secret_key');

        return is_string($secret) && $secret !== '' ? $secret : null;
    }

    /**
     * Authenticate a Paystack webhook via its HMAC-SHA512 signature.
     */
    public function verifySignature(string $payload, ?string $signature): bool
    {
        $secret = $this->secret();

        return $secret !== null
            && is_string($signature)
            && hash_equals(hash_hmac('sha512', $payload, $secret), $signature);
    }

    /**
     * Start (or restart) a tenant's subscription and return the mirror record,
     * carrying the Paystack checkout URL the church pays through. The optional
     * $callbackUrl is where Paystack redirects the payer once done (the signup
     * wizard's return page, CHR-175).
     */
    public function initialize(Tenant $tenant, Plan $plan, string $email, ?string $callbackUrl = null): Subscription
    {
        $subscription = Subscription::query()->updateOrCreate(
            ['tenant_id' => $tenant->id],
            ['plan_id' => $plan->id, 'status' => SubscriptionStatus::Trialing],
        );

        $response = Http::withToken((string) $this->secret())
            ->acceptJson()
            ->post('https://api.paystack.co/transaction/initialize', array_filter([
                'email' => $email,
                'amount' => $plan->price_month,
                'currency' => $plan->currency,
                'plan' => $plan->paystack_plan_code,
                'callback_url' => $callbackUrl,
                'metadata' => ['tenant_id' => $tenant->id, 'plan_code' => $plan->code],
            ]));

        $data = (array) $response->json('data', []);

        $subscription->update([
            'authorization_url' => $data['authorization_url'] ?? null,
            'paystack_customer_code' => $data['customer']['customer_code'] ?? $subscription->paystack_customer_code,
        ]);

        return $subscription->refresh();
    }

    /**
     * Verify a checkout transaction on the signup callback (CHR-175). Paystack
     * appends the reference to the return URL; a successful verify runs through
     * the same activation path as the webhook (so provisioning starts even if
     * the webhook is delayed). Returns the applied outcome, or 'pending'.
     */
    public function verify(string $reference): string
    {
        $response = Http::withToken((string) $this->secret())
            ->acceptJson()
            ->get('https://api.paystack.co/transaction/verify/'.urlencode($reference));

        $data = (array) $response->json('data', []);

        if (($data['status'] ?? null) !== 'success') {
            return 'pending';
        }

        return $this->applyEvent('charge.success', $data);
    }

    /**
     * Map a Paystack webhook event onto the mirrored subscription + the tenant's
     * denormalised status. Returns a short outcome string for logging.
     */
    public function applyEvent(string $event, array $data): string
    {
        $subscription = $this->resolveSubscription($data);

        if ($subscription === null) {
            return 'ignored';
        }

        return match ($event) {
            'subscription.create', 'charge.success' => $this->activate($subscription, $data),
            'invoice.payment_failed' => $this->transition($subscription, SubscriptionStatus::PastDue),
            'subscription.disable', 'subscription.not_renew' => $this->transition($subscription, SubscriptionStatus::Suspended),
            default => 'ignored',
        };
    }

    private function resolveSubscription(array $data): ?Subscription
    {
        if ($tenantId = data_get($data, 'metadata.tenant_id')) {
            if ($subscription = Subscription::query()->where('tenant_id', $tenantId)->latest('id')->first()) {
                return $subscription;
            }
        }

        if ($code = data_get($data, 'subscription_code') ?? data_get($data, 'subscription.subscription_code')) {
            if ($subscription = Subscription::query()->where('paystack_subscription_code', $code)->first()) {
                return $subscription;
            }
        }

        if ($customer = data_get($data, 'customer.customer_code')) {
            return Subscription::query()->where('paystack_customer_code', $customer)->first();
        }

        return null;
    }

    private function activate(Subscription $subscription, array $data): string
    {
        $subscription->update([
            'status' => SubscriptionStatus::Active,
            'paystack_subscription_code' => data_get($data, 'subscription_code')
                ?? data_get($data, 'subscription.subscription_code')
                ?? $subscription->paystack_subscription_code,
            'paystack_customer_code' => data_get($data, 'customer.customer_code') ?? $subscription->paystack_customer_code,
            'paystack_email_token' => data_get($data, 'email_token') ?? $subscription->paystack_email_token,
            'current_period_end' => $this->periodEnd($data),
        ]);

        $subscription->tenant?->update([
            'plan_id' => $subscription->plan_id,
            'subscription_status' => SubscriptionStatus::Active,
        ]);

        // A paid signup held its database build until now (CHR-175) — release it.
        $this->releaseProvisioning($subscription->tenant);

        return 'active';
    }

    /**
     * Once a paid signup's first charge lands, move the tenant off AwaitingPayment
     * and dispatch its database build. Guarded so renewal charges (already Ready)
     * and the idempotent webhook/callback double-fire don't re-provision.
     */
    private function releaseProvisioning(?Tenant $tenant): void
    {
        $tenant = $tenant?->fresh();

        if ($tenant?->provisioning_status !== ProvisioningStatus::AwaitingPayment) {
            return;
        }

        $tenant->forceFill(['provisioning_status' => ProvisioningStatus::Pending])->save();

        ProvisionTenant::dispatch($tenant);
    }

    private function transition(Subscription $subscription, SubscriptionStatus $status): string
    {
        $subscription->update(['status' => $status]);
        $subscription->tenant?->update(['subscription_status' => $status]);

        return $status->value;
    }

    private function periodEnd(array $data): Carbon
    {
        $next = data_get($data, 'next_payment_date') ?? data_get($data, 'subscription.next_payment_date');

        if (is_string($next)) {
            try {
                return Carbon::parse($next);
            } catch (\Throwable) {
                // fall through
            }
        }

        return now()->addMonth();
    }
}
