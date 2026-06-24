<?php

// use Illuminate\Database\Eloquent\Builder;
// use Illuminate\Database\Eloquent\Model;
// use Illuminate\Database\Query\Builder as QueryBuilder;
// use Illuminate\Http\Request;
// use Keky\QueryMaster\Enums\SearchOperator;
// use Keky\QueryMaster\Search;
// use Keky\QueryMaster\Tests\Models\ProfileModel;
// use Keky\QueryMaster\Tests\Models\TestModel;
// use Keky\QueryMaster\Tests\Stubs\TestBuilder;
// use Mockery;
// use Mockery\MockInterface;

// beforeEach(function () {
//     $this->model = new TestModel();
//     // $this->query = new TestBuilder($this->model);
//     // $this->queryBuilder = $this->partialMock(QueryBuilder::class);
//     $this->query = $this->partialMock(Builder::class);
//     // $this->query->shouldReceive('getQuery')->andReturn($this->queryBuilder);
//     $this->query->shouldReceive('when')->andReturnSelf();
//     $this->query->shouldReceive('orWhere')->with(\Mockery::on(function ($arg) {
//         expect($arg)->toBeCallable();
//         $arg($this->query);
//         return true;
//     }))->andReturnSelf();
//     // $this->queryBuilder->shouldReceive('whereLike')->andReturnSelf();
//     // $this->queryBuilder->shouldReceive('withWhereHas')->andReturnSelf();
// });

// it('returns array of search instances', function () {
//     $searchable = $this->model->searchable();

//     expect($searchable)
//         ->toBeArray()
//         ->sequence(
//             fn ($search) => $search->toBeInstanceOf(Search::class),
//             fn ($search) => $search->toBeInstanceOf(Search::class),
//             fn ($search) => $search->toBeInstanceOf(Search::class),
//             fn ($search) => $search->toBeInstanceOf(Search::class)
//         );
// });

// it('handles invalid searchable property', function () {
//     $model = new class extends Model {
//         use \Keky\QueryMaster\Concerns\IsSearchable;

//         protected $searchable = 'invalid';
//     };

//     expect($model->searchable())
//         ->toBeArray()
//         ->toBeEmpty();
// });

// it('filters search instances by query fields', function () {
//     $instances = $this->model->searchInstances(['name', 'email']);

//     $fields = collect($instances)->map->queryField()->all();
//     expect($fields)->toMatchArray(['name', 'email']);
// });

// it('can search with direct field', function () {
//     $this->query->expects('where')->with('name', '>', 'test')->andReturnSelf();
//     $this->model->scopeSearch($this->query, 'test');
// });

// it('can search with relationship field', function () {
//     $this->query->shouldReceive('qualifyColumn')->andReturn('profile.bio');
//     $this->model->scopeSearch($this->query, 'test', ['profile.bio']);
// });

// it('can search with custom operator', function () {
//     $this->query->shouldReceive('qualifyColumn')->andReturn('description');
//     $this->model->scopeSearch($this->query, 'test', ['description']);
// });

// it('can search on request', function () {
//     $request = Request::create('/', 'GET', [
//         config('query-master.search.query') => 'test',
//         config('query-master.search.query_fields') => ['name', 'email'],
//     ]);
//     app()->instance(Request::class, $request);

//     $this->query->shouldReceive('qualifyColumn')->andReturn('name');
//     $this->model->scopeSearchOnRequest($this->query);
// });

// it('returns original query for empty search', function () {
//     $this->model->scopeSearch($this->query, '');
// });
