<?php

namespace App\Http\Middleware;

use App\Services\CurrencyService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetCurrencyMiddleware
{
    public function __construct(private readonly CurrencyService $currencyService) {}

    /**
     * Intercept X-Currency header (or 'currency' cookie) and store the selected
     * currency code in the request for downstream controllers to consume.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Priority 1: explicit header sent by the front-end
        $code = $request->header('X-Currency');

        // Priority 2: cookie stored by the browser after the first selection
        if (empty($code)) {
            $code = $request->cookie('currency');
        }

        // Validate that the requested currency is actually active; fall back to pivot
        if ($code) {
            $validCodes = $this->currencyService->getExchangeRates()->pluck('code')->toArray();
            if (! in_array(strtoupper($code), $validCodes, true)) {
                $code = null;
            }
        }

        // Store in the request object so controllers can access it via $request->currency_code
        $request->merge(['currency_code' => $code ? strtoupper($code) : null]);

        return $next($request);
    }
}
