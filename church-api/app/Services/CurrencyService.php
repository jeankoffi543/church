<?php

namespace App\Services;

use App\Models\Currency;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class CurrencyService
{
    /**
     * Free, no-key exchange-rate feed. Queried with EUR as base since XOF/XAF
     * are a fixed treaty peg to EUR (BCEAO/BEAC), not a market rate — see
     * syncRatesFromMarket().
     */
    private const RATES_API_URL = 'https://open.er-api.com/v6/latest/EUR';

    /** Legal peg: 1 EUR = 655.957 XOF (and XAF), fixed by treaty. */
    private const XOF_PER_EUR = 655.957;

    /**
     * Get active currencies and exchange rates.
     */
    public function getExchangeRates(): Collection
    {
        return Currency::where('is_active', true)->get();
    }

    /**
     * Convert an amount from pivot currency to target currency.
     */
    public function convert($amount, string $toCurrencyCode): float
    {
        $rates = Cache::remember('active_currencies_map', 3600, function () {
            return Currency::where('is_active', true)->pluck('exchange_rate', 'code')->toArray();
        });

        $rate = $rates[$toCurrencyCode] ?? 1.0;

        return (float) ($amount * $rate);
    }

    /**
     * Refresh exchange_rate for every currency except XOF/XAF (fixed treaty
     * peg, never overwritten here) from a live EUR-based feed, rescaled onto
     * the XOF pivot. Intended to run daily via the scheduler
     * (`currency:sync-rates`).
     *
     * @return array{updated: int, skipped: int, error: string|null}
     */
    public function syncRatesFromMarket(): array
    {
        try {
            $response = Http::timeout(15)->retry(2, 200)->get(self::RATES_API_URL);
        } catch (Throwable $e) {
            Log::warning('Currency rate sync: provider unreachable.', ['error' => $e->getMessage()]);

            return ['updated' => 0, 'skipped' => 0, 'error' => 'Fournisseur de taux injoignable.'];
        }

        if (! $response->ok() || $response->json('result') !== 'success') {
            Log::warning('Currency rate sync: unexpected provider response.', ['status' => $response->status()]);

            return ['updated' => 0, 'skipped' => 0, 'error' => 'Réponse invalide du fournisseur de taux.'];
        }

        $ratesVsEur = $response->json('rates', []);
        // Use the provider's own EUR→XOF cross when present (keeps every rate
        // internally consistent with the same source), else fall back to the
        // official peg.
        $xofPerEur = (float) ($ratesVsEur['XOF'] ?? self::XOF_PER_EUR);

        $updated = 0;
        $skipped = 0;

        Currency::whereNotIn('code', ['XOF', 'XAF'])->get(['id', 'code'])->each(function (Currency $currency) use ($ratesVsEur, $xofPerEur, &$updated, &$skipped) {
            if (! isset($ratesVsEur[$currency->code]) || $xofPerEur <= 0) {
                $skipped++;

                return;
            }

            $currency->update([
                'exchange_rate' => round(((float) $ratesVsEur[$currency->code]) / $xofPerEur, 6),
            ]);
            $updated++;
        });

        Cache::forget('active_currencies_map');

        Log::info('Currency rate sync completed.', ['updated' => $updated, 'skipped' => $skipped]);

        return ['updated' => $updated, 'skipped' => $skipped, 'error' => null];
    }
}
