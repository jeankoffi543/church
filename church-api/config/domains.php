<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Domain registrar (reseller) — CHR-203
    |--------------------------------------------------------------------------
    |
    | Availability is always answered from RDAP + our own DB (no account needed).
    | A registrar adds the *price* to register a free domain, and later the
    | purchase flow (level-B epic). Drivers:
    |
    |   null  — no reseller (default): RDAP-only availability, no price.
    |   stub  — deterministic offline pricing, for dev/tests.
    |   gandi — live pricing from the Gandi API v5 (CHR-205). Set DOMAIN_REGISTRAR=
    |           gandi and GANDI_API_KEY. Other resellers (OpenSRS / Namecheap / …)
    |           implement the same App\Contracts\DomainRegistrar and add a driver.
    |
    */

    'registrar' => [
        'driver' => env('DOMAIN_REGISTRAR'),
        'currency' => env('DOMAIN_REGISTRAR_CURRENCY', 'USD'),

        'gandi' => [
            // Gandi API key or Personal Access Token (see the `scheme`). Create at
            // https://account.gandi.net → Security. Without it the driver prices nothing.
            'api_key' => env('GANDI_API_KEY'),
            // Auth header scheme: 'Apikey' (classic key) or 'Bearer' (PAT).
            'scheme' => env('GANDI_AUTH_SCHEME', 'Apikey'),
            'endpoint' => env('GANDI_ENDPOINT', 'https://api.gandi.net/v5'),
        ],
    ],

];
