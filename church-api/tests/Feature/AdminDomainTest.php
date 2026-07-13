<?php

use App\Enums\DomainStatus;
use App\Enums\DomainType;
use App\Enums\SslStatus;
use App\Models\Domain;
use App\Models\Tenant;
use App\Services\DomainVerificationService;

/*
| CHR-148 — a church adds its own custom domain from the back-office: pending +
| DNS instructions, TXT-based verification, and TLS status. Runs in tenant
| context (the global beforeEach maps localhost to an active tenant).
*/

function customDomain(string $host = 'www.grace.org'): Domain
{
    return Domain::query()->create([
        'tenant_id' => Tenant::query()->value('id'),
        'domain' => $host,
        'type' => DomainType::Custom,
        'ssl_status' => SslStatus::Pending,
        'verification_token' => 'chr_token',
    ]);
}

it('lists the tenant domains', function () {
    actingAsSuperAdmin();

    $this->getJson('http://localhost/api/v1/admin/domains')
        ->assertOk()
        ->assertJsonStructure(['data' => [['id', 'domain', 'is_primary', 'verified', 'ssl_status']]]);
});

it('adds a custom domain as pending with DNS instructions', function () {
    actingAsSuperAdmin();

    $this->postJson('http://localhost/api/v1/admin/domains', ['domain' => 'www.grace.org'])
        ->assertCreated()
        ->assertJsonPath('data.domain', 'www.grace.org')
        ->assertJsonPath('data.type', 'custom')
        ->assertJsonPath('data.ssl_status', 'pending')
        ->assertJsonPath('data.verified', false)
        ->assertJsonStructure(['instructions' => ['cname' => ['target'], 'txt' => ['host', 'value']]]);

    expect(Domain::query()->where('domain', 'www.grace.org')->exists())->toBeTrue();
});

it('refuses a platform subdomain', function () {
    actingAsSuperAdmin();

    $this->postJson('http://localhost/api/v1/admin/domains', ['domain' => 'hack.churchapp.io'])
        ->assertStatus(422);
});

it('verifies a domain once its TXT record is live', function () {
    actingAsSuperAdmin();
    $domain = customDomain();

    $this->mock(DomainVerificationService::class, fn ($mock) => $mock->shouldReceive('verify')->andReturnTrue());

    $this->postJson("http://localhost/api/v1/admin/domains/{$domain->id}/verify")
        ->assertOk()
        ->assertJsonPath('verified', true)
        ->assertJsonPath('data.status', 'verified')
        ->assertJsonPath('data.ssl_status', 'issued');

    expect($domain->refresh()->verified_at)->not->toBeNull()
        ->and($domain->status)->toBe(DomainStatus::Verified);
});

it('reports a domain still not verified', function () {
    actingAsSuperAdmin();
    $domain = customDomain();

    $this->mock(DomainVerificationService::class, fn ($mock) => $mock->shouldReceive('verify')->andReturnFalse());

    $this->postJson("http://localhost/api/v1/admin/domains/{$domain->id}/verify")
        ->assertStatus(422)
        ->assertJsonPath('verified', false);

    expect($domain->refresh()->verified_at)->toBeNull();
});

it('removes a custom domain but never the primary', function () {
    actingAsSuperAdmin();
    $custom = customDomain();
    $primary = Domain::query()->where('is_primary', true)->firstOrFail();

    $this->deleteJson("http://localhost/api/v1/admin/domains/{$custom->id}")->assertOk();
    expect(Domain::query()->whereKey($custom->id)->exists())->toBeFalse();

    $this->deleteJson("http://localhost/api/v1/admin/domains/{$primary->id}")->assertStatus(422);
});

it('gates adding a custom domain behind the custom_domain feature', function () {
    actingAsSuperAdmin();
    Tenant::query()->firstOrFail()->update(['features' => ['custom_domain' => false]]);

    $this->postJson('http://localhost/api/v1/admin/domains', ['domain' => 'www.grace.org'])
        ->assertForbidden();
});

/*
| CHR-176 — activation state machine: a verified custom domain can be promoted to
| the church's live primary hostname, demoting whatever held the slot.
*/

it('activates a verified custom domain as the new primary', function () {
    actingAsSuperAdmin();
    $tenantId = Tenant::query()->value('id');
    $previousPrimary = Domain::query()->where('is_primary', true)->firstOrFail();
    $domain = customDomain();
    $domain->update(['status' => DomainStatus::Verified, 'verified_at' => now()]);

    $this->postJson("http://localhost/api/v1/admin/domains/{$domain->id}/activate")
        ->assertOk()
        ->assertJsonPath('data.status', 'active')
        ->assertJsonPath('data.is_primary', true);

    expect($domain->refresh()->is_primary)->toBeTrue()
        ->and($domain->status)->toBe(DomainStatus::Active)
        ->and($previousPrimary->refresh()->is_primary)->toBeFalse()
        ->and(Domain::query()->where('tenant_id', $tenantId)->where('is_primary', true)->count())->toBe(1);
});

it('refuses to activate a domain that is not yet verified', function () {
    actingAsSuperAdmin();
    $domain = customDomain();

    $this->postJson("http://localhost/api/v1/admin/domains/{$domain->id}/activate")
        ->assertStatus(422);

    expect($domain->refresh()->is_primary)->toBeFalse();
});
