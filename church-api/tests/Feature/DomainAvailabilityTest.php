<?php

use App\Enums\DomainType;
use App\Models\Tenant;
use Illuminate\Support\Facades\Http;

/*
| CHR-198 — any-TLD domain availability for the signup wizard: format + reserved
| + our DB + the online registry (RDAP). RDAP is faked; no real network in tests.
*/

it('rejects an invalid domain format', function () {
    $this->getJson('/api/platform/signup/domain?name='.urlencode('not a domain'))
        ->assertOk()
        ->assertJsonPath('available', false)
        ->assertJsonPath('reason', 'invalid');
});

it('reserves the platform root domain and its subdomains', function () {
    $root = config('tenancy.central_root_domain');

    $this->getJson('/api/platform/signup/domain?name='.$root)
        ->assertOk()
        ->assertJsonPath('available', false)
        ->assertJsonPath('reason', 'reserved');

    $this->getJson('/api/platform/signup/domain?name=grace.'.$root)
        ->assertJsonPath('reason', 'reserved');
});

it('reports a domain already attached to a church as taken (no registry call)', function () {
    Http::fake(); // fail if any HTTP goes out — DB check must short-circuit
    Tenant::first()->domains()->create(['domain' => 'grace.org', 'type' => DomainType::Custom]);

    $this->getJson('/api/platform/signup/domain?name=grace.org')
        ->assertOk()
        ->assertJsonPath('available', false)
        ->assertJsonPath('registered', true)
        ->assertJsonPath('reason', 'taken');

    Http::assertNothingSent();
});

it('marks a free domain (RDAP 404) as available', function () {
    Http::fake(fn () => Http::response('', 404));

    $this->getJson('/api/platform/signup/domain?name=totally-free-church.org')
        ->assertOk()
        ->assertJsonPath('available', true)
        ->assertJsonPath('registered', false)
        ->assertJsonPath('reason', null);
});

it('marks a registered domain (RDAP 200) as unavailable', function () {
    Http::fake(fn () => Http::response(['ldhName' => 'taken.org'], 200));

    $this->getJson('/api/platform/signup/domain?name=taken.org')
        ->assertOk()
        ->assertJsonPath('available', false)
        ->assertJsonPath('registered', true)
        ->assertJsonPath('reason', 'registered');
});

it('is undetermined when the registry is unreachable', function () {
    Http::fake(fn () => Http::response('', 500));

    $this->getJson('/api/platform/signup/domain?name=maybe-church.io')
        ->assertOk()
        ->assertJsonPath('available', null)
        ->assertJsonPath('reason', 'unknown');
});

it('requires a name', function () {
    $this->getJson('/api/platform/signup/domain')->assertStatus(422);
});
