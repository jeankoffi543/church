<?php

namespace Keky\QueryMaster;

use Illuminate\Support\Traits\Conditionable;
use Keky\QueryMaster\Concerns\Queryable;
use Keky\QueryMaster\Enums\SearchOperator;

class Search
{
    use Conditionable;
    use Queryable {
        operatorFromQueryField as private parentOperatorFromQueryField;
    }

    /**
     * @param  string  $field
     */
    final public function __construct($field)
    {
        $this->field = $field;
        $this->setOperator(SearchOperator::LIKE);
    }

    /**
     * Get query parameter field
     *
     * @return string
     */
    public function queryField()
    {
        return $this->field;
    }

    /**
     * Set filter operator from query field
     *
     * @param  string  $operatorEnum
     * @return void
     */
    protected function operatorFromQueryField($operatorEnum)
    {
        $this->parentOperatorFromQueryField($operatorEnum);
        $this->field = explode('__', $this->field)[0];
    }

    /**
     * Create new search
     *
     * @param  string  $field
     * @param  SearchOperator|null  $operator
     * @return static
     */
    public static function make($field, $operator = null)
    {
        $instance = new static($field);
        if ($operator === null) {
            $instance->operatorFromQueryField(SearchOperator::class);
        } else {
            $instance->setOperator($operator);
        }

        return $instance;
    }
}
