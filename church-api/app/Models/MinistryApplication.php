<?php

namespace App\Models;

use App\Enums\MinistryApplicationStatus;
use Database\Factories\MinistryApplicationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
    use HasFactory;

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
