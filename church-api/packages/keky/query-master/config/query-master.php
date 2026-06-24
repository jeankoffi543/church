<?php

use Keky\QueryMaster\Enums\SortDirection;

// config for KEKY Technologies query-master
return [
    'search' => [
        'query' => 'search',

        'query_fields' => 'search_fields',
    ],

    'sort' => [
        'query' => 'sort',

        'direction' => SortDirection::ASC,
    ],
];
