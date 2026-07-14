<?php

use App\Contracts\DomainRegistrar;
use App\Services\Registrar\NullRegistrar;
use App\Services\Registrar\StubRegistrar;
use Illuminate\Support\Facades\Http;

/*
| CHR-203 — domain reseller scaffold: the DomainRegistrar contract + null/stub
| drivers, and the registration price flowing into the availability endpoint.
*/

it('the null registrar (default) cannot price a domain', function () {
    expect((new NullRegistrar)->quote('grace-parish.org'))->toBeNull();
});

it('the stub registrar prices by TLD', function () {
    $stub = new StubRegistrar('USD');

    $org = $stub->quote('grace-parish.org');
    expect($org)->not->toBeNull()
        ->and($org->price)->toBe(1400)
        ->and($org->currency)->toBe('USD')
        ->and($org->periodYears)->toBe(1)
        ->and($org->premium)->toBeFalse();

    expect($stub->quote('grace-parish.io')->price)->toBe(3500);
    expect($stub->quote('grace-parish.example')->price)->toBe(2000); // fallback TLD
});

it('the stub registrar flags short second-level names as premium (×5)', function () {
    $quote = (new StubRegistrar('USD'))->quote('abc.com');

    expect($quote->premium)->toBeTrue()
        ->and($quote->price)->toBe(1200 * 5);
});

it('availability carries a registration price when a registrar is configured', function () {
    $this->app->instance(DomainRegistrar::class, new StubRegistrar('USD'));
    Http::fake(fn () => Http::response('', 404)); // RDAP: free to register

    $this->getJson('/api/platform/signup/domain?name=totally-free-parish.org')
        ->assertOk()
        ->assertJsonPath('available', true)
        ->assertJsonPath('price.price', 1400)
        ->assertJsonPath('price.currency', 'USD')
        ->assertJsonPath('price.period_years', 1)
        ->assertJsonPath('price.premium', false);
});

it('availability has no price with the default (null) registrar', function () {
    Http::fake(fn () => Http::response('', 404));

    $this->getJson('/api/platform/signup/domain?name=free-default-parish.org')
        ->assertOk()
        ->assertJsonPath('available', true)
        ->assertJsonPath('price', null);
});

it('a registered or reserved domain never carries a price', function () {
    $this->app->instance(DomainRegistrar::class, new StubRegistrar('USD'));
    Http::fake(fn () => Http::response(['ldhName' => 'x'], 200)); // RDAP: taken

    $this->getJson('/api/platform/signup/domain?name=taken-parish.org')
        ->assertOk()
        ->assertJsonPath('available', false)
        ->assertJsonPath('price', null);
});
