<?php

use App\Providers\AppServiceProvider;
use App\Providers\TenancyServiceProvider;
use Keky\QueryMaster\QueryMasterServiceProvider;

return [
    AppServiceProvider::class,
    QueryMasterServiceProvider::class,
    TenancyServiceProvider::class,
];
