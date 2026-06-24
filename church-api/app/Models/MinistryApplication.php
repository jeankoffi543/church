<?php

namespace App\Models;

use App\Enums\MinistryApplicationStatus;
use Database\Factories\MinistryApplicationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Keky\QueryMaster\Concerns\HasFilters;
use Keky\QueryMaster\Concerns\IsSearchable;
use Keky\QueryMaster\Concerns\IsSortable;
use Keky\QueryMaster\Enums\SearchOperator;
use Keky\QueryMaster\Filter;

/**
 * @property int $id
 * @property int|null $user_id
 * @property string $name
 * @property string $email
 * @property string $phone
 * @property int $ministry_id
 * @property string $motivation
 * @property MinistryApplicationStatus $status
 */
class MinistryApplication extends Model
{
    /** @use HasFactory<MinistryApplicationFactory> */
    use HasFactory, HasFilters, IsSearchable, IsSortable;

    protected array $searchable = [
        'name' => SearchOperator::LIKE,
        'email' => SearchOperator::LIKE,
        'motivation' => SearchOperator::LIKE,
    ];

    protected array $sortable = [
        'name',
        'status',
        'created_at',
    ];

    public function filters(): array
    {
        return [
            Filter::make('status', 'status'),
            Filter::make('ministry_id', 'ministry_id'),
            Filter::make('user_id', 'user_id'),
            Filter::make('name', 'name'),
        ];
    }

    protected $fillable = [
        'user_id',
        'name',
        'email',
        'phone',
        'ministry_id',
        'motivation',
        'status',
        'decision_note',
        'decision_note_public',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => MinistryApplicationStatus::class,
            'decision_note_public' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Ministry, $this>
     */
    public function ministry(): BelongsTo
    {
        return $this->belongsTo(Ministry::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
