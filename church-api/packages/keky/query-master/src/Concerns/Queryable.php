<?php

namespace Keky\QueryMaster\Concerns;

use Illuminate\Database\Eloquent\Builder;

trait Queryable
{
    /**
     * @var string
     */
    private $field;

    /**
     * @var string
     */
    private $queryField;

    /**
     * @var \BackedEnum
     */
    public $operator;

    /**
     * @var bool
     */
    private $caseInsensitive = false;

    /**
     * @var bool
     */
    private $not = false;

    /**
     * @var \Closure|null
     */
    private $applyWith = null;

    /**
     * Set query parameter field

     *
     * @param  string  $queryField
     * @return static
     */
    public function setQueryField($queryField)
    {
        $this->queryField = $queryField;

        return $this;
    }

    /**
     * Set filter operator
     *
     * @param  \BackedEnum  $operator
     * @return static
     */
    public function setOperator($operator)
    {
        $this->operator = $operator;

        return $this;
    }

    /**
     * Set filter operator from query field
     *
     * @param  string  $operatorEnum
     * @return void
     */
    protected function operatorFromQueryField($operatorEnum)
    {
        if (! is_a($operatorEnum, \BackedEnum::class, true)) {
            throw new \InvalidArgumentException('$operatorEnum must be an instance of BackedEnum');
        }

        $queryField = $this->queryField();
        $operatorKeys = implode('|', array_keys($operatorEnum::values())); // @phpstan-ignore-line
        preg_match_all("/__(i|n)?($operatorKeys)$/", $queryField, $matches);
        $operatorKey = empty($matches[2]) ? null : $matches[2][0];
        $not = empty($matches[1]) ? false : $matches[1][0] === 'n';
        $caseInsensitive = empty($matches[1]) ? false : $matches[1][0] === 'i';

        if ($operatorKey && $caseInsensitive && version_compare(app()->version(), '11.0.0', '>=')) {
            $this->setCaseInsensitive(true);
        }

        if ($operatorKey && $not) {
            $this->setNot(true);
        }

        if ($operatorKey) {
            $this->setOperator($operatorEnum::from($operatorKey));
        }
    }

    /**
     * Set not
     *
     * @param  bool  $not
     * @return static
     */
    public function setNot($not)
    {
        $this->not = $not;

        return $this;
    }

    /**
     * Set case insensitive
     *
     * @param  bool  $caseInsensitive
     * @return static
     */
    public function setCaseInsensitive($caseInsensitive)
    {
        $this->caseInsensitive = $caseInsensitive;

        return $this;
    }

    /**
     * Get query parameter field
     *
     * @return string
     */
    public function queryField()
    {
        $this->queryField ??= $this->field;  // @phpstan-ignore-line

        return $this->queryField;
    }

    /**
     * Set custom apply function
     *
     * @param  \Closure(Builder,mixed,string,\BackedEnum,bool,bool):void  $apply
     * @return static
     */
    public function applyWith($apply)
    {
        $this->applyWith = $apply;

        return $this;
    }

    /**
     * Apply filter
     *
     * @param  Builder  $query
     * @return void
     */
    public function apply($query, $field, $value)
    {
        if (! is_null($this->applyWith)) {
            ($this->applyWith)($query, $value, $field, $this->operator, $this->not, $this->caseInsensitive);

            return;
        }

        match (($this->operator)()) {
            'lt' => $query->where($field, '<', $value),
            'lte' => $query->where($field, '<=', $value),
            'gt' => $query->where($field, '>', $value),
            'gte' => $query->where($field, '>=', $value),
            'bw' => $query->whereBetween($field, $value, not: $this->not),
            'in' => $this->not ? $query->whereNotIn($field, (array) $value) : $query->whereIn($field, (array) $value),
            'lk' => $query->when(
                $this->caseInsensitive, fn ($q) => $q->whereLike($field, "%{$value}%", ! $this->caseInsensitive, not: $this->not),
                fn ($q) => $q->where($field, $this->not ? 'NOT LIKE' : 'LIKE', "%{$value}%")
            ),
            'sw' => $query->when(
                $this->caseInsensitive, fn ($q) => $q->whereLike($field, "{$value}%", ! $this->caseInsensitive, not: $this->not),
                fn ($q) => $q->where($field, $this->not ? 'NOT LIKE' : 'LIKE', "{$value}%")
            ),
            'ew' => $query->when(
                $this->caseInsensitive, fn ($q) => $q->whereLike($field, "%{$value}", ! $this->caseInsensitive, not: $this->not),
                fn ($q) => $q->where($field, $this->not ? 'NOT LIKE' : 'LIKE', "%{$value}")
            ),
            default => is_array($value)
                ? ($this->not ? $query->whereNotIn($field, $value) : $query->whereIn($field, $value))
                : $query->where($field, $this->not ? '!=' : '=', $value),
        };
    }
}
