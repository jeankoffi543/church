<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One timeline entry (appel, visite, sms…) in a {@see FollowUp}'s care
 * journey.
 *
 * @property int $id
 * @property int $follow_up_id
 * @property string $action_type
 * @property string $note
 * @property int|null $created_by
 */
class FollowUpNote extends Model
{
    use HasFactory;

    protected $fillable = [
        'follow_up_id',
        'action_type',
        'note',
        'created_by',
    ];

    /**
     * @return BelongsTo<FollowUp, $this>
     */
    public function followUp(): BelongsTo
    {
        return $this->belongsTo(FollowUp::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
