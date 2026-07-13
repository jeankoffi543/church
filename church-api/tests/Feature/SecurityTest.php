<?php

use App\Models\Tenant;

// CHR-192 — security hardening: baseline response headers, and the guarantee that
// tenancy is resolved from the request Host, never from a client-supplied header.

it('sets baseline security headers on every response', function () {
    $this->getJson('http://localhost/api/v1/public/settings')
        ->assertOk()
        ->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('X-Frame-Options', 'DENY')
        ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
});

it('resolves tenancy by Host, ignoring a forged x-tenant header', function () {
    $localhost = Tenant::first();

    $response = $this->getJson('http://localhost/api/v1/public/realtime', [
        'X-Tenant-Id' => 'attacker-tenant-id',
        'X-Tenant-Domain' => 'evil.churchapp.io',
    ]);

    $response->assertOk();
    // The realtime channel prefix carries the Host-resolved tenant's key — the
    // spoofed header switched nothing.
    expect($response->json('data.channel_prefix'))->toContain($localhost->getTenantKey());
});
