<?php

namespace App\Models;

use App\Support\QueryFilters;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Keky\QueryMaster\Concerns\HasFilters;
use Keky\QueryMaster\Concerns\IsSearchable;
use Keky\QueryMaster\Concerns\IsSortable;
use Keky\QueryMaster\Enums\SearchOperator;

class Branch extends Model
{
    use HasFactory, HasFilters, IsSearchable, IsSortable;

    protected array $searchable = [
        'title' => SearchOperator::LIKE,
        'description' => SearchOperator::LIKE,
        'address' => SearchOperator::LIKE,
        'phone' => SearchOperator::LIKE,
        'website' => SearchOperator::LIKE,
    ];

    protected array $sortable = [
        'title',
        'address',
        'created_at',
    ];

    public function filters(): array
    {
        return [
            ...QueryFilters::exact('pastor_id'),
            ...QueryFilters::exact('pastor_id', 'pastor'),
            ...QueryFilters::text('title'),
            ...QueryFilters::text('address'),
        ];
    }

    protected $fillable = [
        'title',
        'slug',
        'description',
        'address',
        'phone',
        'hours',
        'lat',
        'lng',
        'website',
        'pastor_id',
    ];

    /**
     * Get the pastor associated with this branch.
     */
    public function pastor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pastor_id');
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'lat' => 'float',
            'lng' => 'float',
        ];
    }
}
