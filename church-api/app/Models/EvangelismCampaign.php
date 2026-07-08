<?php

namespace App\Models;

use App\Support\QueryFilters;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Keky\QueryMaster\Concerns\HasFilters;
use Keky\QueryMaster\Concerns\IsSearchable;
use Keky\QueryMaster\Concerns\IsSortable;
use Keky\QueryMaster\Enums\SearchOperator;

/**
 * A dated evangelism outreach (sortie d'évangélisation) — the campaign a
 * {@see Convert} can optionally be attributed to.
 *
 * @property int $id
 * @property string $title
 * @property Carbon $date
 * @property string|null $location
 * @property string|null $notes
 */
class EvangelismCampaign extends Model
{
    use HasFactory, HasFilters, IsSearchable, IsSortable;

    protected array $searchable = [
        'title' => SearchOperator::LIKE,
        'location' => SearchOperator::LIKE,
    ];

    protected array $sortable = [
        'title',
        'date',
        'created_at',
    ];

    public function filters(): array
    {
        return [
            ...QueryFilters::text('title'),
            ...QueryFilters::text('location'),
        ];
    }

    protected $fillable = [
        'title',
        'date',
        'location',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
        ];
    }

    /**
     * @return HasMany<Convert, $this>
     */
    public function converts(): HasMany
    {
        return $this->hasMany(Convert::class);
    }
}
