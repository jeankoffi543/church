<?php

namespace Keky\QueryMaster;

use Keky\QueryMaster\Enums\SortDirection;

final class Sort
{
    /**
     * @var string
     */
    protected $field;

    /**
     * @var \Keky\QueryMaster\Enums\SortDirection
     */
    protected $direction;

    public function __construct($field, $direction = SortDirection::ASC)
    {
        $this->field = $field;
        $this->direction = $direction;
    }

    /**
     * Set sort direction
     *
     * @param  \Keky\QueryMaster\Enums\SortDirection  $direction
     * @return static
     */
    public function setDirection($direction)
    {
        $this->direction = $direction;

        return $this;
    }

    /**
     * Get sort direction
     *
     * @return \Keky\QueryMaster\Enums\SortDirection
     */
    public function direction()
    {
        return $this->direction;
    }

    /**
     * Get sort field
     *
     * @return string
     */
    public function field()
    {
        return $this->field;
    }

    /**
     * Create new sort
     *
     * @param  string  $field
     * @param  \Keky\QueryMaster\Enums\SortDirection  $direction
     * @return static
     */
    public static function make($field, $direction = SortDirection::ASC)
    {
        return new self($field, $direction);
    }
}
