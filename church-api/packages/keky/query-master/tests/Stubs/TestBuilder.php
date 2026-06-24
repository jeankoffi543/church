<?php

namespace Keky\QueryMaster\Tests\Stubs;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class TestBuilder extends Builder
{
    public function __construct(Model $model)
    {
        parent::__construct($model->newQuery()->getQuery());
        $this->setModel($model);
    }
}
