<?php

namespace Keky\QueryMaster;

use Illuminate\Support\ServiceProvider;

class QueryMasterServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/query-master.php', 'query-master');
    }

    public function boot(): void
    {
        $this->publishes([
            __DIR__.'/../config/query-master.php' => config_path('query-master.php'),
        ], 'query-master-config');
    }
}
