<?php

namespace Tests\Unit\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Keky\QueryMaster\Concerns\IsSortable;
use Keky\QueryMaster\Tests\Models\TestModel;

it('can sort query using sortable fields', function () {
    $model = new TestModel;
    $query = mock(['class' => Builder::class])->makePartial();

    $query->expects('orderBy')
        ->with('name', 'asc')
        ->andReturnSelf();

    $model->scopeSort($query, ['name' => 'asc']);
});

it('can sort query with default direction', function () {
    $model = new TestModel;
    $query = mock(['class' => Builder::class])->makePartial();

    $query->expects('orderBy')
        ->with('name', config('query-master.sort.direction')->value)
        ->andReturnSelf();

    $model->scopeSort($query, ['name']);
});

it('respects predefined sort directions', function () {
    $model = new TestModel;
    $query = mock(['class' => Builder::class])->makePartial();

    $query->expects('orderBy')
        ->with('created_at', 'desc')
        ->andReturnSelf();

    $model->scopeSort($query, ['created_at']);
});

it('can sort on request', function () {
    $model = new TestModel;
    $query = mock(['class' => Builder::class])->makePartial();
    $request = Request::create('/', 'GET', [
        config('query-master.sort.query') => ['name' => 'desc'],
    ]);
    app()->instance(Request::class, $request);

    $query->expects('orderBy')
        ->with('name', 'desc')
        ->andReturnSelf();

    $model->scopeSortOnRequest($query);
});

it('returns empty array for invalid sortable property', function () {
    $model = new class extends Model
    {
        use IsSortable;

        protected $sortable = 'invalid';
    };

    expect($model->sortable())->toBeArray()->toBeEmpty();
});

it('filters out non-sortable fields', function () {
    $model = new TestModel;
    $query = mock(['class' => Builder::class])->makePartial();

    $query->expects('orderBy')->never();

    $model->scopeSort($query, ['invalid_field' => 'asc']);
});
