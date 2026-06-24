<?php

namespace Keky\QueryMaster\Enums;

use ArchTech\Enums\InvokableCases;
use ArchTech\Enums\Values;

enum SearchOperator: string
{
    use InvokableCases, Values;
    case EQUAL = 'eq';
    case LIKE = 'lk';
    case STARTS_WITH = 'sw';
    case ENDS_WITH = 'ew';
}
