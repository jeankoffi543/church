<?php

namespace App\Support;

use Keky\QueryMaster\Enums\FilterOperator;
use Keky\QueryMaster\Filter;

/**
 * Factory helpers that expand a single model field into the set of
 * QueryMaster filters matching every operator the Next.js admin QueryBuilder
 * can emit (see church-client `serializeFiltersForQueryMaster`).
 *
 * The admin UI serialises a graphical filter to `field__<suffix>=value`:
 * - `equals`      -> `field__eq`
 * - `contains`    -> `field__lk`
 * - `starts_with` -> `field__sw`
 * - `ends_with`   -> `field__ew`
 *
 * QueryMaster only applies a filter when the incoming request key matches a
 * registered `queryField` exactly, so each suffix needs its own Filter
 * instance. The operator is passed explicitly (the package's suffix-parsing
 * relies on `array_keys(FilterOperator::values())`, which yields integer keys
 * and therefore never matches — so a bare `field__lk` queryField would silently
 * resolve to EQUAL). These helpers keep the model `filters()` declarations terse.
 */
final class QueryFilters
{
    /**
     * Operator-aware variants for a free-text column: the bare key (exact /
     * `whereIn` for arrays — used by the public site) plus the four suffixes
     * the admin text filters produce.
     *
     * @return array<int, Filter>
     */
    public static function text(string $field, ?string $alias = null): array
    {
        $alias ??= $field;

        return [
            Filter::make($field, $alias),
            Filter::make($field, "{$alias}__eq", FilterOperator::EQUAL),
            Filter::make($field, "{$alias}__lk", FilterOperator::LIKE),
            Filter::make($field, "{$alias}__sw", FilterOperator::STARTS_WITH),
            Filter::make($field, "{$alias}__ew", FilterOperator::ENDS_WITH),
        ];
    }

    /**
     * Exact-match variants (bare key + `__eq`) for a column driven by a
     * `<select>` in the admin (booleans, enums, foreign keys).
     *
     * @return array<int, Filter>
     */
    public static function exact(string $field, ?string $alias = null): array
    {
        $alias ??= $field;

        return [
            Filter::make($field, $alias),
            Filter::make($field, "{$alias}__eq", FilterOperator::EQUAL),
        ];
    }
}
