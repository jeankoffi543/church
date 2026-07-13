<?php

use App\Enums\DomainType;
use App\Models\Domain;
use App\Models\Tenant;

/*
| CHR-177 — Caddy on-demand TLS gate: only known hostnames get a certificate.
| Verified custom domains and platform subdomains are authorized; unverified or
| unknown hosts are refused so nobody can force ACME issuance against our edge.
*/

function tenantId(): string
{
    return (string) Tenant::query()->value('id');
}

it('authorizes a verified custom domain', function () {
    Domain::factory()->for(Tenant::query()->firstOrFail())->verified()->create(['domain' => 'www.grace.org']);

    $this->getJson('/api/platform/tls/authorize?domain=www.grace.org')
        ->assertOk()
        ->assertJsonPath('authorized', true)
        ->assertJsonPath('domain', 'www.grace.org');
});

it('refuses a custom domain whose ownership is not verified', function () {
    Domain::factory()->for(Tenant::query()->firstOrFail())->create(['domain' => 'www.pending.org']); // pending by default

    $this->getJson('/api/platform/tls/authorize?domain=www.pending.org')
        ->assertNotFound()
        ->assertJsonPath('authorized', false);
});

it('refuses an unknown host', function () {
    $this->getJson('/api/platform/tls/authorize?domain=attacker.example.com')
        ->assertNotFound()
        ->assertJsonPath('authorized', false);
});

it('authorizes a known platform subdomain', function () {
    Domain::query()->create([
        'tenant_id' => tenantId(),
        'domain' => 'grace.churchapp.io',
        'type' => DomainType::Subdomain,
    ]);

    $this->getJson('/api/platform/tls/authorize?domain=grace.churchapp.io')
        ->assertOk()
        ->assertJsonPath('authorized', true);
});

it('refuses an unregistered platform subdomain', function () {
    $this->getJson('/api/platform/tls/authorize?domain=ghost.churchapp.io')
        ->assertNotFound()
        ->assertJsonPath('authorized', false);
});

it('normalises the host and requires the domain parameter', function () {
    Domain::factory()->for(Tenant::query()->firstOrFail())->verified()->create(['domain' => 'www.grace.org']);

    $this->getJson('/api/platform/tls/authorize?domain='.urlencode('WWW.Grace.org.'))
        ->assertOk()
        ->assertJsonPath('authorized', true);

    $this->getJson('/api/platform/tls/authorize')
        ->assertStatus(400)
        ->assertJsonPath('authorized', false);
});
