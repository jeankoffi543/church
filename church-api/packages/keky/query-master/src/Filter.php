<?php

namespace Keky\QueryMaster;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Arr;
use Illuminate\Support\Traits\Conditionable;
use Keky\QueryMaster\Concerns\Queryable;
use Keky\QueryMaster\Concerns\Validation;
use Keky\QueryMaster\Enums\FilterOperator;
use Keky\QueryMaster\Enums\FilterValidationMode;

final class Filter
{
    use Conditionable, Validation;
    use Queryable {
        apply as private parentApply;
    }

    protected array $values;

    /**
     * @var bool
     */
    protected $visible = true;

    /**
     * @param  string  $field
     */
    final public function __construct($field)
    {
        $this->field = $field;
        $this->setOperator(FilterOperator::EQUAL);
    }

    /**
     * Populate filter values
     *
     * @return static
     */
    public function populate(string|array $values)
    {
        if (! is_array($values) || ! Arr::isAssoc($values) || ! Arr::has($values, $this->field)) {
            $values = [
                $this->field => $values,
            ];
        }

        $this->values = $values;

        return $this;
    }

    /**
     * Set filter as invisible
     *
     * @return static
     */
    public function setInvisible()
    {
        $this->visible = false;

        return $this;
    }

    /**
     * Check if filter is visible
     *
     * @return bool
     */
    public function visible()
    {
        return $this->visible;
    }

    /**
     * Create new filter
     *
     * @param  string  $field
     * @param  string|null  $queryField
     * @param  FilterOperator|null  $operator
     * @param  FilterValidationMode  $validationMode
     * @return static
     */
    public static function make($field, $queryField = null, $operator = null, $validationMode = FilterValidationMode::THROW)
    {
        $instance = new self($field);
        if ($queryField !== null) {
            $instance->setQueryField($queryField);
        }

        if ($operator === null) {
            $instance->operatorFromQueryField(FilterOperator::class);
        } else {
            $instance->setOperator($operator);
        }

        return $instance->setValidationMode($validationMode);
    }

    /**
     * Apply filter
     *
     * @param  Builder  $query
     * @return void
     */
    public function apply($query)
    {
        $this->parentApply($query, $this->field, $this->values[$this->field]);
    }
}
