<?php

namespace Tests\Unit\Concerns;

use Illuminate\Container\Container;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Keky\QueryMaster\Concerns\HasFilters;
use Keky\QueryMaster\Enums\FilterValidationMode;
use Keky\QueryMaster\Filter;
use Keky\QueryMaster\Tests\Models\TestModel;
use Mockery;

class NonVisibleTestModel extends Model
{
    use HasFilters;

    public function filters(): array
    {
        return [
            Filter::make('test_field', 'test')->setInvisible(),
        ];
    }
}

it('can get filter instances', function () {
    $model = new TestModel;
    $instances = $model->filterInstances();

    expect($instances)
        ->toBeInstanceOf(Collection::class)
        ->and($instances->first())
        ->toBeInstanceOf(Filter::class);
});

it('filters out non-visible filters', function () {
    $model = new NonVisibleTestModel;

    expect($model->filterInstances())->toBeEmpty();
});

class ValidatedTestModel extends Model
{
    use HasFilters;

    public function filters(): array
    {
        return [
            Filter::make('validated_field', 'validated')->setValidationRules([
                'validated_field' => 'integer',
            ]),
        ];
    }
}

class SkipValidationTestModel extends Model
{
    use HasFilters;

    public function filters(): array
    {
        return [
            Filter::make('skip_field', 'skip', validationMode: FilterValidationMode::FILTER)->setValidationRules([
                'skip_field' => 'required|string|min:10',
            ]),
        ];
    }
}

it('can filter query using filter values', function () {
    $model = new TestModel;
    $queryBuilder = Mockery::mock(['class' => QueryBuilder::class]);
    $query = Mockery::mock(['class' => Builder::class]);
    $query->shouldReceive('getQuery')->andReturn($queryBuilder);
    $query->shouldReceive('where')->with('test_field', '=', 'test_value')->once();

    $model->scopeFilter($query, ['test' => 'test_value']);
});

it('ignores empty filter values', function () {
    $model = new TestModel;
    $queryBuilder = Mockery::mock(['class' => QueryBuilder::class]);
    $query = Mockery::mock(['class' => Builder::class]);
    $query->shouldReceive('getQuery')->andReturn($queryBuilder);
    $query->shouldReceive('where')->never();

    $model->scopeFilter($query, ['test' => '']);
});

it('can filter on request', function () {
    $model = new TestModel;
    $queryBuilder = Mockery::mock(['class' => QueryBuilder::class]);
    $query = Mockery::mock(['class' => Builder::class]);
    $query->shouldReceive('getQuery')->andReturn($queryBuilder);
    $request = Request::create('/', 'GET', ['test' => 'test_value']);

    Container::getInstance()->instance(Request::class, $request);

    $query->shouldReceive('where')->with('test_field', '=', 'test_value')->once();
    $model->scopeFilterOnRequest($query);
});

it('validates filter values when validation mode is throw', function () {
    $model = new ValidatedTestModel;

    $queryBuilder = Mockery::mock(['class' => QueryBuilder::class]);
    $query = Mockery::mock(['class' => Builder::class]);
    $query->shouldReceive('getQuery')->andReturn($queryBuilder);

    expect(fn () => $model->scopeFilter($query, ['validated' => 'invalid']))
        ->toThrow(\Illuminate\Validation\ValidationException::class);
});

it('skips filter application when validation fails', function () {
    $model = new SkipValidationTestModel;

    $queryBuilder = Mockery::mock(['class' => QueryBuilder::class]);
    $query = Mockery::mock(['class' => Builder::class]);
    $query->shouldReceive('getQuery')->andReturn($queryBuilder);
    $query->shouldReceive('where')->never();

    $model->scopeFilter($query, ['skip' => 'invalid']);
});

afterEach(function () {
    Mockery::close();
});
