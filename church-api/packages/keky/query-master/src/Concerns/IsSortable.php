<?php

namespace Keky\QueryMaster\Concerns;

use Illuminate\Container\Container;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Keky\QueryMaster\Enums\SortDirection;
use Keky\QueryMaster\Sort;

trait IsSortable // @phpstan-ignore-line
{
    /**
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @param  array  $sort
     * @return void
     */
    public function scopeSort($query, $sort = [])
    {
        collect($this->sortableInstances($sort))
            ->each(static fn (Sort $sort_) => $query->orderBy($sort_->field(), $sort_->direction()->value));
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @return void
     */
    public function scopeSortOnRequest($query)
    {
        $request = Container::getInstance()->make(Request::class);

        $this->scopeSort(
            $query,
            $request->get(config('query-master.sort.query'), []),
        );
    }

    /**
     * @return array
     */
    public function sortable()
    {
        if (! isset($this->sortable)) {
            $this->sortable = [];
        } elseif (! is_array($this->sortable)) {
            $this->sortable = [];
        }

        return Arr::map($this->sortable, static function (string|SortDirection $queryName, int|string $field) {
            if (is_string($field)) {
                if ($queryName instanceof SortDirection) {
                    return Sort::make($field, $queryName);
                }

                return Sort::make($field, config('query-master.sort.direction'));
            }

            return Sort::make($queryName, config('query-master.sort.direction'));
        });
    }

    /**
     * @param  array<string, SortDirection>  $sort
     * @return \Illuminate\Support\Collection
     */
    protected function sortableInstances($sort)
    {
        $sortFields = $this->sortFields($sort);

        return collect($this->sortable())
            ->when(count($sortFields) > 0, static fn ($collection) => $collection->filter(static fn (Sort $sort_) => in_array($sort_->field(), $sortFields))
                ->map(static function (Sort $sort_) use ($sort) {
                    if (isset($sort[$sort_->field()])) {
                        $direction = $sort[$sort_->field()];
                        if (is_string($direction)) {
                            $direction = strtolower($direction) === 'desc' ? SortDirection::DESC : SortDirection::ASC;
                        }

                        return $sort_->setDirection($direction);
                    }

                    return $sort_;
                })
            );
    }

    protected function sortFields($sort): array
    {
        return Arr::map($sort, static fn (string $direction, string|int $field) => is_int($field) ? $direction : $field);
    }
}
