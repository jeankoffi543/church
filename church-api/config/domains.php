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
    |   (gandi / opensrs / …) — plug a real App\Contracts\DomainRegistrar here
    |                            once credentials + an implementation exist.
    |
    */

    'registrar' => [
        'driver' => env('DOMAIN_REGISTRAR'),
        'currency' => env('DOMAIN_REGISTRAR_CURRENCY', 'USD'),

        // Real drivers read their own credentials from here, e.g.
        // 'gandi' => ['api_key' => env('GANDI_API_KEY')],
    ],

];
