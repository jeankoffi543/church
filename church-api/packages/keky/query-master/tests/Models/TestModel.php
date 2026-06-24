<?php

namespace Keky\QueryMaster\Tests\Models;

use Illuminate\Database\Eloquent\Model;
use Keky\QueryMaster\Concerns\HasFilters;
use Keky\QueryMaster\Concerns\IsSearchable;
use Keky\QueryMaster\Concerns\IsSortable;
use Keky\QueryMaster\Enums\SearchOperator;
use Keky\QueryMaster\Enums\SortDirection;
use Keky\QueryMaster\Filter;

class TestModel extends Model
{
    use HasFilters;
    use IsSearchable;
    use IsSortable;

    protected array $searchable = [
        'name__gt',
        'email',
        'description' => SearchOperator::LIKE,
        'profile.bio',  // Relationship field
    ];

    protected array $sortable = [
        'name',
        'email',
        'created_at' => SortDirection::DESC,
    ];

    public function filters(): array
    {
        return [
            Filter::make('test_field', 'test'),
        ];
    }

    // public function profile()
    // {
    //     return $this->belongsTo(ProfileModel::class);
    // }
}
