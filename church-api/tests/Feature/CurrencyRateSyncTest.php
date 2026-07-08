<?php

use App\Models\Currency;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

it('refreshes market rates but leaves the XOF/XAF peg untouched', function () {
    Currency::factory()->create(['code' => 'XOF', 'symbol' => 'F CFA', 'exchange_rate' => 1, 'is_default' => true, 'is_active' => true]);
    Currency::factory()->create(['code' => 'XAF', 'symbol' => 'FCFA', 'exchange_rate' => 1, 'is_default' => false, 'is_active' => true]);
    Currency::factory()->create(['code' => 'EUR', 'symbol' => '€', 'exchange_rate' => 0.002, 'is_default' => false, 'is_active' => true]);
    Currency::factory()->create(['code' => 'USD', 'symbol' => '$', 'exchange_rate' => 0.002, 'is_default' => false, 'is_active' => true]);

    Cache::put('active_currencies_map', ['stale' => 1], 3600);

    Http::fake([
        'open.er-api.com/*' => Http::response([
            'result' => 'success',
            'rates' => [
                'XOF' => 655.957,
                'EUR' => 1,
                'USD' => 1.08,
            ],
        ], 200),
    ]);

    $this->artisan('currency:sync-rates')->assertSuccessful();

    expect(Currency::where('code', 'XOF')->value('exchange_rate'))->toBe(1.0)
        ->and(Currency::where('code', 'XAF')->value('exchange_rate'))->toBe(1.0)
        ->and(Currency::where('code', 'EUR')->value('exchange_rate'))->toBe(round(1 / 655.957, 6))
        ->and(Currency::where('code', 'USD')->value('exchange_rate'))->toBe(round(1.08 / 655.957, 6))
        ->and(Cache::has('active_currencies_map'))->toBeFalse();
});

it('fails gracefully and leaves rates untouched when the provider is unreachable', function () {
    Currency::factory()->create(['code' => 'XOF', 'exchange_rate' => 1, 'is_default' => true, 'is_active' => true]);
    Currency::factory()->create(['code' => 'EUR', 'exchange_rate' => 0.001524, 'is_default' => false, 'is_active' => true]);

    Http::fake([
        'open.er-api.com/*' => Http::response([], 500),
    ]);

    $this->artisan('currency:sync-rates')->assertFailed();

    expect(Currency::where('code', 'EUR')->value('exchange_rate'))->toBe(0.001524);
});
