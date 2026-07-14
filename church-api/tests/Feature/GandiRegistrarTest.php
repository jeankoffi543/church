<?php

use App\Contracts\DomainRegistrar;
use App\Services\Registrar\GandiRegistrar;
use App\Support\Domains\RegistrantContact;
use Illuminate\Support\Facades\Http;

function gandiOwner(): RegistrantContact
{
    return new RegistrantContact('Church', 'App', 'ops@churchapp.io', '1 Rue', 'Paris', '75001', 'FR', '+33.100000000');
}

/*
| CHR-205 — the live Gandi API v5 pricing driver. Gandi is faked; no real network
| and no credentials needed in tests.
*/

/**
 * @param  array<string, mixed>  $overrides
 */
function gandiCheck(string $status = 'available', float $priceBeforeTaxes = 14.5, array $overrides = []): array
{
    return array_merge([
        'currency' => 'USD',
        'grid' => 'A',
        'products' => [
            array_merge([
                'status' => $status,
                'process' => 'create',
                'name' => 'example.org',
                'prices' => [[
                    'duration_unit' => 'y',
                    'min_duration' => 1,
                    'max_duration' => 1,
                    'price_before_taxes' => $priceBeforeTaxes,
                    'price_after_taxes' => $priceBeforeTaxes * 1.2,
                    'discount' => false,
                ]],
            ], $overrides),
        ],
    ]);
}

it('prices an available domain from Gandi and sends the auth header', function () {
    Http::fake(['*gandi.net*' => Http::response(gandiCheck(), 200)]);

    $quote = (new GandiRegistrar('secret-key'))->quote('example.org');

    expect($quote)->not->toBeNull()
        ->and($quote->price)->toBe(1450) // 14.50 → minor units
        ->and($quote->currency)->toBe('USD')
        ->and($quote->periodYears)->toBe(1)
        ->and($quote->premium)->toBeFalse();

    Http::assertSent(function ($request) {
        return $request->hasHeader('Authorization', 'Apikey secret-key')
            && str_contains($request->url(), '/domain/check')
            && str_contains($request->url(), 'name=example.org');
    });
});

it('flags Gandi premium names', function () {
    Http::fake(['*gandi.net*' => Http::response(gandiCheck(overrides: ['tld_type' => 'premium']), 200)]);

    expect((new GandiRegistrar('secret-key'))->quote('example.org')->premium)->toBeTrue();
});

it('returns null when Gandi says the domain is unavailable', function () {
    Http::fake(['*gandi.net*' => Http::response(gandiCheck(status: 'unavailable'), 200)]);

    expect((new GandiRegistrar('secret-key'))->quote('taken.org'))->toBeNull();
});

it('returns null on a Gandi API error, never a wrong price', function () {
    Http::fake(['*gandi.net*' => Http::response('boom', 500)]);

    expect((new GandiRegistrar('secret-key'))->quote('example.org'))->toBeNull();
});

it('makes no call and returns null without an API key', function () {
    Http::fake();

    expect((new GandiRegistrar(null))->quote('example.org'))->toBeNull();
    Http::assertNothingSent();
});

it('flows the Gandi price through the availability endpoint', function () {
    $this->app->instance(DomainRegistrar::class, new GandiRegistrar('secret-key'));
    Http::fake([
        '*rdap.org*' => Http::response('', 404),          // RDAP: free to register
        '*gandi.net*' => Http::response(gandiCheck(priceBeforeTaxes: 9.99), 200),
    ]);

    $this->getJson('/api/platform/signup/domain?name=totally-free-parish.org')
        ->assertOk()
        ->assertJsonPath('available', true)
        ->assertJsonPath('price.price', 999)
        ->assertJsonPath('price.currency', 'USD');
});

it('registers a domain via Gandi with the owner contact + duration + nameservers', function () {
    Http::fake(['*gandi.net*' => Http::response(['id' => 'op-123'], 201)]);

    $gandi = new GandiRegistrar('secret-key', 'Apikey', 'https://api.gandi.net/v5', 'USD', gandiOwner(), ['ns1.churchapp.io', 'ns2.churchapp.io']);
    $result = $gandi->register('example.org', 2);

    expect($result->successful)->toBeTrue()
        ->and($result->reference)->toBe('op-123');

    Http::assertSent(function ($request) {
        $body = $request->data();

        return $request->method() === 'POST'
            && str_contains($request->url(), '/domain/domains')
            && ($body['fqdn'] ?? null) === 'example.org'
            && ($body['duration'] ?? null) === 2
            && ($body['owner']['email'] ?? null) === 'ops@churchapp.io'
            && ($body['nameservers'] ?? null) === ['ns1.churchapp.io', 'ns2.churchapp.io'];
    });
});

it('surfaces a Gandi registration error message', function () {
    Http::fake(['*gandi.net*' => Http::response(['message' => 'Insufficient funds'], 402)]);

    $result = (new GandiRegistrar('secret-key', 'Apikey', 'https://api.gandi.net/v5', 'USD', gandiOwner()))
        ->register('example.org');

    expect($result->successful)->toBeFalse()
        ->and($result->message)->toBe('Insufficient funds');
});

it('refuses to register without an API key or without a registrant contact', function () {
    Http::fake();

    expect((new GandiRegistrar(null, owner: gandiOwner()))->register('example.org')->successful)->toBeFalse();
    expect((new GandiRegistrar('secret-key'))->register('example.org')->successful)->toBeFalse(); // no owner

    Http::assertNothingSent();
});

it('renews a domain via Gandi', function () {
    Http::fake(['*gandi.net*' => Http::response(['id' => 'renew-op-1'], 202)]);

    $result = (new GandiRegistrar('secret-key', 'Apikey', 'https://api.gandi.net/v5', 'USD'))->renew('example.org', 1);

    expect($result->successful)->toBeTrue()
        ->and($result->reference)->toBe('renew-op-1');

    Http::assertSent(fn ($request) => $request->method() === 'POST' && str_contains($request->url(), '/domain/domains/example.org/renew'));
});
