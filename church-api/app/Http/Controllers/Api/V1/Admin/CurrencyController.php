<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Currency;
use App\Models\Setting;
use App\Services\CurrencyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class CurrencyController extends Controller
{
    public function __construct(private readonly CurrencyService $currencyService) {}

    /**
     * List all currencies (active and inactive).
     */
    public function index(): JsonResponse
    {
        $currencies = Currency::orderByDesc('is_default')
            ->orderBy('code')
            ->get();

        return response()->json(['data' => $currencies]);
    }

    /**
     * Update a currency's exchange_rate and/or is_active flag.
     */
    public function update(Request $request, Currency $currency): JsonResponse
    {
        $validated = $request->validate([
            'exchange_rate' => ['sometimes', 'numeric', 'min:0.000001'],
            'is_active' => ['sometimes', 'boolean'],
            'symbol' => ['sometimes', 'string', 'max:20'],
        ]);

        $currency->update($validated);

        // Flush the rate cache so conversions are immediately up-to-date
        Cache::forget('active_currencies_map');

        return response()->json(['data' => $currency->fresh()]);
    }

    /**
     * Set a currency as the pivot (default). Exactly one currency must be default.
     */
    public function setDefault(Currency $currency): JsonResponse
    {
        // Unset all current defaults
        Currency::where('is_default', true)->update(['is_default' => false]);

        // The new default must be active and has rate 1.0 (pivot definition)
        $currency->update([
            'is_default' => true,
            'is_active' => true,
            'exchange_rate' => 1.000000,
        ]);

        Setting::set('default_currency_id', $currency->id, 'store');

        Cache::forget('active_currencies_map');

        return response()->json(['data' => $currency->fresh()]);
    }
}
