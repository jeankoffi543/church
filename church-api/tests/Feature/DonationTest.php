<?php

use App\Enums\DonationStatus;
use App\Jobs\SendDonationReceipt;
use App\Models\Donation;
use App\Models\WebhookEvent;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Http;

/* ── Public: initialize & status ────────────────────────────────── */

it('initializes a pending donation and returns the paystack keys', function () {
    config(['services.paystack.public_key' => 'pk_test_123']);

    $this->postJson('/api/v1/public/donations/initialize', [
        'donor_name' => 'Jean Koffi',
        'donor_email' => 'jean@example.com',
        'purpose_key' => 'dime',
        'amount' => 5000,
        'frequency' => 'unique',
    ])
        ->assertCreated()
        ->assertJsonPath('data.public_key', 'pk_test_123')
        ->assertJsonPath('data.amount', 5000);

    $donation = Donation::first();
    expect($donation->status)->toBe(DonationStatus::Pending);
    expect($donation->reference)->toStartWith('DON-');
});

it('validates the donation payload', function () {
    $this->postJson('/api/v1/public/donations/initialize', [
        'donor_name' => 'X',
        'purpose_key' => 'dime',
        'amount' => 10, // below minimum
        'frequency' => 'weekly', // invalid enum
    ])->assertStatus(422)->assertJsonValidationErrors(['donor_email', 'amount', 'frequency']);
});

it('exposes the accounting status of a donation', function () {
    Donation::factory()->create(['reference' => 'DON-2026-ABCDE', 'status' => DonationStatus::Pending]);

    $this->getJson('/api/v1/public/donations/DON-2026-ABCDE/status')
        ->assertOk()
        ->assertJsonPath('data.status', 'pending');
});

/* ── Webhook security ───────────────────────────────────────────── */

it('rejects a webhook with a missing or invalid signature', function () {
    config(['services.paystack.secret_key' => 'sk_test_secret']);
    $payload = json_encode(['event' => 'charge.success', 'data' => ['reference' => 'X']]);

    $this->call('POST', '/api/v1/webhooks/paystack', [], [], [], [
        'HTTP_X_PAYSTACK_SIGNATURE' => 'forged',
        'CONTENT_TYPE' => 'application/json',
    ], $payload)->assertStatus(401);
});

it('reconciles a charge.success webhook and dispatches the receipt', function () {
    Bus::fake();
    config(['services.paystack.secret_key' => 'sk_test_secret']);

    $donation = Donation::factory()->create(['reference' => 'DON-2026-PAYOK', 'status' => DonationStatus::Pending]);

    $payload = json_encode([
        'event' => 'charge.success',
        'data' => ['reference' => 'DON-2026-PAYOK', 'channel' => 'mobile_money', 'id' => 99],
    ]);
    $signature = hash_hmac('sha512', $payload, 'sk_test_secret');

    $this->call('POST', '/api/v1/webhooks/paystack', [], [], [], [
        'HTTP_X_PAYSTACK_SIGNATURE' => $signature,
        'CONTENT_TYPE' => 'application/json',
    ], $payload)->assertOk();

    $donation->refresh();
    expect($donation->status)->toBe(DonationStatus::Success);
    expect($donation->channel)->toBe('mobile_money');
    Bus::assertDispatched(SendDonationReceipt::class);
});

it('is idempotent for an already-reconciled donation', function () {
    Bus::fake();
    config(['services.paystack.secret_key' => 'sk_test_secret']);

    Donation::factory()->create(['reference' => 'DON-2026-DONE', 'status' => DonationStatus::Success]);

    $payload = json_encode(['event' => 'charge.success', 'data' => ['reference' => 'DON-2026-DONE']]);
    $signature = hash_hmac('sha512', $payload, 'sk_test_secret');

    $this->call('POST', '/api/v1/webhooks/paystack', [], [], [], [
        'HTTP_X_PAYSTACK_SIGNATURE' => $signature,
        'CONTENT_TYPE' => 'application/json',
    ], $payload)->assertOk();

    Bus::assertNotDispatched(SendDonationReceipt::class);
});

/* ── Webhook audit log + replay ─────────────────────────────────── */

it('logs every webhook hit (valid and invalid)', function () {
    config(['services.paystack.secret_key' => 'sk_test_secret']);
    Donation::factory()->create(['reference' => 'DON-2026-LOGOK', 'status' => DonationStatus::Pending]);

    $ok = json_encode(['event' => 'charge.success', 'data' => ['reference' => 'DON-2026-LOGOK', 'channel' => 'card']]);
    $this->call('POST', '/api/v1/webhooks/paystack', [], [], [], [
        'HTTP_X_PAYSTACK_SIGNATURE' => hash_hmac('sha512', $ok, 'sk_test_secret'),
        'CONTENT_TYPE' => 'application/json',
    ], $ok)->assertOk();

    $this->call('POST', '/api/v1/webhooks/paystack', [], [], [], [
        'HTTP_X_PAYSTACK_SIGNATURE' => 'forged',
        'CONTENT_TYPE' => 'application/json',
    ], json_encode(['event' => 'charge.success', 'data' => ['reference' => 'X']]))->assertStatus(401);

    expect(WebhookEvent::where('status', 'processed')->count())->toBe(1);
    expect(WebhookEvent::where('status', 'invalid')->count())->toBe(1);
});

it('replays a stored webhook and re-reconciles the donation', function () {
    Bus::fake();
    actingAsAdminWith(['view_finances']);

    $donation = Donation::factory()->create(['reference' => 'DON-2026-RPLAY', 'status' => DonationStatus::Pending]);
    $log = WebhookEvent::create([
        'provider' => 'paystack',
        'event' => 'charge.success',
        'reference' => 'DON-2026-RPLAY',
        'signature_valid' => true,
        'status' => 'ignored',
        'payload' => ['event' => 'charge.success', 'data' => ['reference' => 'DON-2026-RPLAY', 'channel' => 'mobile_money']],
    ]);

    $this->postJson("/api/v1/admin/webhook-events/{$log->id}/replay")
        ->assertOk()
        ->assertJsonPath('data.status', 'processed');

    expect($donation->fresh()->status)->toBe(DonationStatus::Success);
    Bus::assertDispatched(SendDonationReceipt::class);
});

it('replays an already-successful webhook (forced re-reconciliation)', function () {
    Bus::fake();
    actingAsAdminWith(['view_finances']);

    Donation::factory()->create(['reference' => 'DON-2026-AGAIN', 'status' => DonationStatus::Success]);
    $log = WebhookEvent::create([
        'provider' => 'paystack',
        'event' => 'charge.success',
        'reference' => 'DON-2026-AGAIN',
        'signature_valid' => true,
        'status' => 'processed',
        'payload' => ['event' => 'charge.success', 'data' => ['reference' => 'DON-2026-AGAIN']],
    ]);

    $this->postJson("/api/v1/admin/webhook-events/{$log->id}/replay")
        ->assertOk()
        ->assertJsonPath('data.status', 'processed');

    Bus::assertDispatched(SendDonationReceipt::class);
});

it('syncs pending donations from the Paystack verify API', function () {
    config(['services.paystack.secret_key' => 'sk_test_secret']);
    Bus::fake();
    Http::fake([
        'api.paystack.co/transaction/verify/*' => Http::response([
            'data' => ['status' => 'success', 'reference' => 'DON-2026-SYNC1', 'channel' => 'mobile_money'],
        ], 200),
    ]);
    actingAsAdminWith(['view_finances']);

    $donation = Donation::factory()->create(['reference' => 'DON-2026-SYNC1', 'status' => DonationStatus::Pending]);

    $this->postJson('/api/v1/admin/donations/sync')
        ->assertOk()
        ->assertJsonPath('data.reconciled', 1);

    expect($donation->fresh()->status)->toBe(DonationStatus::Success);
    expect(WebhookEvent::where('event', 'sync.verify')->where('status', 'processed')->count())->toBe(1);
});

it('lists the webhook audit log for finance admins', function () {
    actingAsAdminWith(['view_finances']);
    WebhookEvent::create(['provider' => 'paystack', 'event' => 'charge.success', 'status' => 'processed', 'signature_valid' => true]);

    $this->getJson('/api/v1/admin/webhook-events')
        ->assertOk()
        ->assertJsonStructure(['data' => [['id', 'event', 'status', 'signature_valid', 'date_label']]]);
});

it('manually reconciles a pending donation and sends the receipt', function () {
    Bus::fake();
    actingAsAdminWith(['view_finances']);
    $donation = Donation::factory()->create(['status' => DonationStatus::Pending]);

    $this->patchJson("/api/v1/admin/donations/{$donation->id}/status", ['status' => 'success'])
        ->assertOk()
        ->assertJsonPath('data.status', 'success');

    Bus::assertDispatched(SendDonationReceipt::class);
});

/* ── Admin finances (gated by view_finances) ────────────────────── */

it('blocks the ledger without the view_finances permission', function () {
    actingAsAdminWith([]);
    $this->getJson('/api/v1/admin/donations')->assertForbidden();
});

it('lists, aggregates and exports the ledger for finance admins', function () {
    actingAsAdminWith(['view_finances']);
    Donation::factory()->count(3)->successful()->create(['purpose_key' => 'dime', 'amount' => 10000]);
    Donation::factory()->create(['status' => DonationStatus::Failed]);

    $this->getJson('/api/v1/admin/donations')
        ->assertOk()
        ->assertJsonStructure(['data' => [['reference', 'donor_name', 'amount', 'status', 'date_label']]]);

    $this->getJson('/api/v1/admin/donations/stats')
        ->assertOk()
        ->assertJsonPath('data.total_raised', 30000)
        ->assertJsonPath('data.by_purpose.dime', 30000);

    $this->get('/api/v1/admin/donations/export')
        ->assertOk()
        ->assertHeader('content-type', 'text/csv; charset=UTF-8');
});
