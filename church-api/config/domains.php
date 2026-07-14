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

        // Registrant (owner) contact used to buy domains — the platform acts as
        // reseller on the church's behalf, so this is one platform-wide contact,
        // not per-church data. All fields required to enable purchasing (CHR-206).
        'owner' => [
            'given' => env('DOMAIN_OWNER_GIVEN'),
            'family' => env('DOMAIN_OWNER_FAMILY'),
            'email' => env('DOMAIN_OWNER_EMAIL'),
            'streetaddr' => env('DOMAIN_OWNER_STREET'),
            'city' => env('DOMAIN_OWNER_CITY'),
            'zip' => env('DOMAIN_OWNER_ZIP'),
            'country' => env('DOMAIN_OWNER_COUNTRY'),
            'phone' => env('DOMAIN_OWNER_PHONE'),
            'orgname' => env('DOMAIN_OWNER_ORG'),
            'type' => (int) env('DOMAIN_OWNER_TYPE', 0),
        ],

        // Nameservers a bought domain is created with (point it at the platform
        // edge so on-demand TLS can serve it). Comma-separated.
        'nameservers' => array_values(array_filter(array_map(
            'trim',
            explode(',', (string) env('DOMAIN_NAMESERVERS', '')),
        ))),

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
