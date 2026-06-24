<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Keky\QueryMaster\Concerns\HasFilters;
use Keky\QueryMaster\Concerns\IsSearchable;
use Keky\QueryMaster\Concerns\IsSortable;
use Keky\QueryMaster\Enums\SearchOperator;
use Keky\QueryMaster\Filter;

class HomeGroupApplication extends Model
{
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
            Filter::make('home_group_id', 'home_group_id'),
            Filter::make('user_id', 'user_id'),
            Filter::make('name', 'name'),
        ];
    }

    protected $fillable = [
        'user_id',
        'name',
        'email',
        'phone',
        'home_group_id',
        'motivation',
        'status',
        'processed_by',
        'decision_note',
        'decision_note_public',
    ];

    protected $casts = [
        'decision_note_public' => 'boolean',
    ];

    /**
     * Get the home group applied for.
     */
    public function homeGroup(): BelongsTo
    {
        return $this->belongsTo(HomeGroup::class, 'home_group_id');
    }

    /**
     * Get the user who submitted the application, if registered.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get the administrator/pastor who processed this application.
     */
    public function processor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }
}
