<?php

namespace App\Models;

use App\Support\QueryFilters;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Keky\QueryMaster\Concerns\HasFilters;
use Keky\QueryMaster\Concerns\IsSearchable;
use Keky\QueryMaster\Concerns\IsSortable;
use Keky\QueryMaster\Enums\SearchOperator;

/**
 * A standing service department (Louange, Protocole, Média, Sécurité…) that
 * pools the {@see Member}s who can be scheduled onto it for a given
 * {@see Service} occurrence via {@see ServiceAssignment}.
 *
 * @property int $id
 * @property string $name
 * @property string|null $description
 * @property bool $is_active
 */
class Team extends Model
{
    use HasFactory, HasFilters, IsSearchable, IsSortable;

    protected array $searchable = [
        'name' => SearchOperator::LIKE,
    ];

    protected array $sortable = [
        'name',
        'created_at',
    ];

    public function filters(): array
    {
        return [
            ...QueryFilters::exact('is_active'),
            ...QueryFilters::text('name'),
        ];
    }

    protected $fillable = [
        'name',
        'description',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return BelongsToMany<Member, $this>
     */
    public function members(): BelongsToMany
    {
        return $this->belongsToMany(Member::class, 'team_member');
    }

    /**
     * @return HasMany<ServiceAssignment, $this>
     */
    public function assignments(): HasMany
    {
        return $this->hasMany(ServiceAssignment::class);
    }
}
