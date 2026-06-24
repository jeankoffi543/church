<?php

namespace Keky\QueryMaster\Enums;

use ArchTech\Enums\InvokableCases;
use ArchTech\Enums\Values;

enum FilterOperator: string
{
    use InvokableCases, Values;

    case EQUAL = 'eq';
    case GREATER = 'gt';
    case LOWER = 'lt';
    case GREATER_OR_EQUAL = 'gte';
    case LOWER_OR_EQUAL = 'lte';
    case LIKE = 'lk';
    case STARTS_WITH = 'sw';
    case ENDS_WITH = 'ew';
    case BETWEEN = 'bw';
    case CONTAINS = 'in';
}
