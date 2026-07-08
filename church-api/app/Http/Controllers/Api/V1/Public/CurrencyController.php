<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Services\CurrencyService;
use Illuminate\Http\JsonResponse;

class CurrencyController extends Controller
{
    public function __construct(private readonly CurrencyService $currencyService) {}

    /**
     * Return the list of active currencies with their exchange rates.
     * Consumed by the Next.js front-end to populate the currency selector.
     */
    public function index(): JsonResponse
    {
        $currencies = $this->currencyService->getExchangeRates();

        return response()->json(['data' => $currencies]);
    }
}
