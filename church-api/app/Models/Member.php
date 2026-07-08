<?php

namespace App\Models;

use App\Support\QueryFilters;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Keky\QueryMaster\Concerns\HasFilters;
use Keky\QueryMaster\Concerns\IsSearchable;
use Keky\QueryMaster\Concerns\IsSortable;
use Keky\QueryMaster\Enums\SearchOperator;

/**
 * A congregant/fidèle — the roster of people the church tracks, distinct from
 * the admin `User` (servants with a login) and from an anonymous `Donation`
 * donor. Anchor entity for attendance, follow-up and evangelism, coming in
 * later modules.
 *
 * @property int $id
 * @property string $name
 * @property string|null $phone
 * @property string|null $email
 * @property string|null $gender
 * @property Carbon|null $birthdate
 * @property string|null $address
 * @property string|null $marital_status
 * @property Carbon|null $join_date
 * @property string $member_type
 * @property int|null $home_group_id
 * @property string $status
 * @property string|null $photo
 * @property string|null $notes
 */
class Member extends Model
{
    use HasFactory, HasFilters, IsSearchable, IsSortable;

    protected array $searchable = [
        'name' => SearchOperator::LIKE,
        'phone' => SearchOperator::LIKE,
        'email' => SearchOperator::LIKE,
    ];

    protected array $sortable = [
        'name',
        'member_type',
        'status',
        'join_date',
        'created_at',
    ];

    public function filters(): array
    {
        return [
            ...QueryFilters::exact('status'),
            ...QueryFilters::exact('member_type'),
            ...QueryFilters::exact('home_group_id'),
            ...QueryFilters::text('name'),
            ...QueryFilters::text('phone'),
            ...QueryFilters::text('email'),
        ];
    }

    protected $fillable = [
        'name',
        'phone',
        'email',
        'gender',
        'birthdate',
        'address',
        'marital_status',
        'join_date',
        'member_type',
        'home_group_id',
        'status',
        'photo',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'birthdate' => 'date',
            'join_date' => 'date',
        ];
    }

    /**
     * @return BelongsTo<HomeGroup, $this>
     */
    public function homeGroup(): BelongsTo
    {
        return $this->belongsTo(HomeGroup::class);
    }
}
