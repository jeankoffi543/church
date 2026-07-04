<?php

namespace App\Models;

use App\Support\QueryFilters;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Keky\QueryMaster\Concerns\HasFilters;
use Keky\QueryMaster\Concerns\IsSearchable;
use Keky\QueryMaster\Concerns\IsSortable;
use Keky\QueryMaster\Enums\SearchOperator;

/**
 * @property string $title
 * @property string $slug
 * @property string|null $description
 * @property int $base_price
 * @property int|null $old_price
 * @property string $category
 * @property string|null $badge
 * @property bool $is_digital
 * @property bool $is_featured
 * @property string $status
 * @property array|null $images
 * @property array|null $attributes
 * @property array|null $variants
 */
class Product extends Model
{
    use HasFactory, HasFilters, IsSearchable, IsSortable;

    protected array $searchable = [
        'title' => SearchOperator::LIKE,
        'description' => SearchOperator::LIKE,
        'category' => SearchOperator::LIKE,
    ];

    protected array $sortable = [
        'title',
        'base_price',
        'is_featured',
        'status',
        'category',
        'created_at',
    ];

    public function filters(): array
    {
        return [
            ...QueryFilters::exact('status'),
            ...QueryFilters::exact('category'),
            ...QueryFilters::exact('is_featured'),
            ...QueryFilters::exact('is_digital'),
            ...QueryFilters::text('title'),
        ];
    }

    protected $fillable = [
        'title',
        'slug',
        'description',
        'base_price',
        'old_price',
        'category',
        'badge',
        'is_digital',
        'is_featured',
        'unlimited_stock',
        'low_stock_threshold',
        'status',
        'images',
        'attributes',
        'variants',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'base_price' => 'integer',
            'old_price' => 'integer',
            'is_digital' => 'boolean',
            'is_featured' => 'boolean',
            'unlimited_stock' => 'boolean',
            'low_stock_threshold' => 'integer',
            'images' => 'array',
            'attributes' => 'array',
            'variants' => 'array',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'id';
    }
}
