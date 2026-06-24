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

class PrayerRequest extends Model
{
    use HasFactory, HasFilters, IsSearchable, IsSortable;

    protected array $searchable = [
        'name' => SearchOperator::LIKE,
        'email' => SearchOperator::LIKE,
        'category' => SearchOperator::LIKE,
        'message' => SearchOperator::LIKE,
    ];

    protected array $sortable = [
        'name',
        'category',
        'message',
        'status',
        'assigned_to',
        'created_at',
    ];

    public function filters(): array
    {
        return [
            ...QueryFilters::exact('status'),
            ...QueryFilters::exact('category'),
            ...QueryFilters::exact('assigned_to'),
            ...QueryFilters::text('name'),
            ...QueryFilters::text('email'),
            ...QueryFilters::text('phone'),
            ...QueryFilters::text('message'),
        ];
    }

    protected $fillable = [
        'name',
        'phone',
        'email',
        'category',
        'message',
        'status',
        'assigned_to',
        'pastoral_notes',
    ];

    /**
     * Get the user/pastor assigned to this prayer request.
     */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }
}
