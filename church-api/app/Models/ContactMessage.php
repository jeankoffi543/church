<?php

namespace App\Models;

use App\Enums\ContactMessageStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property string|null $phone
 * @property string $subject
 * @property string $message
 * @property ContactMessageStatus $status
 * @property \Illuminate\Support\Carbon|null $replied_at
 * @property int|null $replied_by
 */
class ContactMessage extends Model
{
    use HasFactory;

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
