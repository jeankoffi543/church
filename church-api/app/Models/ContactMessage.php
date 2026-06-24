<?php

namespace App\Models;

use App\Enums\ContactMessageStatus;
use App\Support\QueryFilters;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Keky\QueryMaster\Concerns\HasFilters;
use Keky\QueryMaster\Concerns\IsSearchable;
use Keky\QueryMaster\Concerns\IsSortable;
use Keky\QueryMaster\Enums\SearchOperator;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property string|null $phone
 * @property string $subject
 * @property string $message
 * @property ContactMessageStatus $status
 * @property Carbon|null $replied_at
 * @property int|null $replied_by
 */
class ContactMessage extends Model
{
    use HasFactory, HasFilters, IsSearchable, IsSortable;

    protected array $searchable = [
        'name' => SearchOperator::LIKE,
        'email' => SearchOperator::LIKE,
        'subject' => SearchOperator::LIKE,
        'message' => SearchOperator::LIKE,
    ];

    protected array $sortable = [
        'name',
        'email',
        'subject',
        'phone',
        'status',
        'created_at',
    ];

    public function filters(): array
    {
        return [
            ...QueryFilters::exact('status'),
            ...QueryFilters::exact('subject'),
            ...QueryFilters::text('name'),
            ...QueryFilters::text('email'),
            ...QueryFilters::text('phone'),
        ];
    }

    protected $fillable = [
        'name',
        'email',
        'phone',
        'subject',
        'message',
        'status',
        'replied_at',
        'replied_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => ContactMessageStatus::class,
            'replied_at' => 'datetime',
        ];
    }

    /**
     * Scope for pending messages.
     */
    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', ContactMessageStatus::Pending);
    }

    /**
     * Scope for read messages.
     */
    public function scopeRead(Builder $query): Builder
    {
        return $query->where('status', ContactMessageStatus::Read);
    }

    /**
     * Scope for archived messages.
     */
    public function scopeArchived(Builder $query): Builder
    {
        return $query->where('status', ContactMessageStatus::Archived);
    }

    /**
     * Relation to the user who replied.
     *
     * @return BelongsTo<User, $this>
     */
    public function repliedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'replied_by');
    }
}
