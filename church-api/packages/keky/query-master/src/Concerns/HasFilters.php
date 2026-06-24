<?php

namespace Keky\QueryMaster\Concerns;

use Illuminate\Container\Container;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Keky\QueryMaster\Enums\FilterValidationMode;
use Keky\QueryMaster\Filter;

trait HasFilters // @phpstan-ignore-line
{
    /**
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @param  array  $values
     * @return void
     */
    public function scopeFilter($query, $values)
    {
        $values = $this->filtersQueryValues($values);

        $this->filterInstances()
            ->filter(
                static fn (Filter $filter) => $values->has($filter->queryField())
            )
            ->each(
                static fn (Filter $filter) => $filter
                    ->populate($values->get($filter->queryField()))
                    ->when(
                        $filter->validationMode === FilterValidationMode::THROW,
                        static function (Filter $filter): void {
                            $filter->validate();
                        }
                    )
                    ->when(
                        ! $filter->validationFails(),
                        static fn (Filter $filter) => $filter->apply($query)
                    )
            );
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @return void
     */
    public function scopeFilterOnRequest($query)
    {
        $request = Container::getInstance()->make(Request::class);

        $this->scopeFilter($query, $request->all());
    }

    /**
     * Get all filters. You can override this method to return your own filters.
     *
     * @return array<\Keky\QueryMaster\Filter>
     */
    public function filters()
    {
        if (! isset($this->filters)) {
            $this->filters = [];
        } elseif (! is_array($this->filters)) {
            $this->filters = [];
        }

        return Arr::map($this->filters, static fn (string $queryName, int|string $field) => is_string($field) ? Filter::make($field, $queryName) : Filter::make($queryName));
    }

    /**
     * @return \Illuminate\Support\Collection
     */
    public function filterInstances()
    {
        return collect($this->filters())
            ->map(
                static fn (Filter|string $filterOrName) => $filterOrName instanceof Filter ? $filterOrName : new $filterOrName
            )
            ->filter(static fn (Filter $filter) => $filter->visible());
    }

    /**
     * @param  array  $values
     * @return \Illuminate\Support\Collection
     */
    protected function filtersQueryValues($values)
    {
        return collect($values)
            ->only($this->filterInstances()->map(static fn (Filter $filter) => $filter->queryField())->values()->all())
            ->filter(static fn ($value) => isset($value) && $value !== '');
    }
}
