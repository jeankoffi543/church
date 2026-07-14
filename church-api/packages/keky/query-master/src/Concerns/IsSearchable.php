<?php

namespace Keky\QueryMaster\Concerns;

use Illuminate\Container\Container;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Keky\QueryMaster\Enums\SearchOperator;
use Keky\QueryMaster\Search;

trait IsSearchable // @phpstan-ignore-line
{
    /**
     * @param  Builder  $query
     * @param  string  $search
     * @param  array  $onlyQueryFields
     * @return void
     */
    public function scopeSearch($query, $search, $onlyQueryFields = [])
    {
        $search = trim($search);

        $query->when(
            $search,
            fn ($query) => $query->where(
                fn ($subQuery) => $this->searchInstances($onlyQueryFields)
                    ->each(fn (Search $search_) => Str::contains($search_->queryField(), '.')
                        ? $subQuery->orWhere(
                            static fn ($orQuery) => $orQuery->withWhereHas(
                                Str::beforeLast($search_->queryField(), '.'),
                                static fn ($andQuery) => $andQuery->where( // Only needed to change inner applyQuery to and from or
                                    static fn ($subquery) => $search_
                                        ->apply($subquery, $subquery->qualifyColumn(Str::afterLast($search_->queryField(), '.')), $search)
                                )
                            )
                        )
                        : $subQuery->orWhere(
                            static fn ($orQuery) => $search_
                                ->apply($orQuery, $query->qualifyColumn($search_->queryField()), $search)
                        )
                    )
            )
        );
    }

    /**
     * @param  Builder  $query
     * @return void
     */
    public function scopeSearchOnRequest($query)
    {
        $request = Container::getInstance()->make(Request::class);

        $this->scopeSearch(
            $query,
            $request->get(config('query-master.search.query'), ''),
            $request->get(config('query-master.search.query_fields'), []),
        );
    }

    /**
     * @return array<Search>
     */
    public function searchable()
    {
        if (! isset($this->searchable)) {
            $this->searchable = [];
        } elseif (! is_array($this->searchable)) {
            $this->searchable = [];
        }

        return array_values(Arr::map($this->searchable, static function (string|SearchOperator $value, int|string $key) {
            if (is_string($key)) {
                if ($value instanceof SearchOperator) {
                    return Search::make($key, $value);
                }

                return Search::make($key);
            }

            return Search::make($value);
        }));
    }

    /**
     * @return Collection<Search>
     */
    public function searchInstances($onlyQueryFields = [])
    {
        return collect($this->searchable())
            ->when(
                count($onlyQueryFields) > 0,
                static fn (Collection $collection) => $collection->filter(static fn (Search $search) => in_array($search->queryField(), $onlyQueryFields))
            );
    }
}
