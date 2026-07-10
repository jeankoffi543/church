<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Tenant Routes
|--------------------------------------------------------------------------
|
| Routes served only on tenant domains, i.e. after the tenant has been
| resolved from the Host and its database connection is active.
|
| CHR-133 intentionally registers NO routes here: the stancl scaffold shipped
| a demo `GET /` guarded by PreventAccessFromCentralDomains, which shadowed the
| central `web.php` `/` route and 404'd on central domains. The real tenant
| route groups (public + admin API behind InitializeTenancyByDomain) are wired
| in CHR-137, once central/tenant route separation lands.
|
| Example (CHR-137):
| Route::middleware([
|     'web',
|     Stancl\Tenancy\Middleware\InitializeTenancyByDomain::class,
|     Stancl\Tenancy\Middleware\PreventAccessFromCentralDomains::class,
| ])->group(function () {
|     // tenant routes…
| });
|
*/
