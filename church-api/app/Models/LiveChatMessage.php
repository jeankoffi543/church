<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int|null $past_live_id
 * @property string $author_name
 * @property string $message
 * @property int $time_offset_seconds
 * @property bool $is_moderated
 * @property Carbon $created_at
 */
class LiveChatMessage extends Model
{
    protected $fillable = [
        'past_live_id',
        'author_name',
        'message',
        'time_offset_seconds',
        'is_moderated',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'time_offset_seconds' => 'integer',
            'is_moderated' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<PastLive, $this>
     */
    public function pastLive(): BelongsTo
    {
        return $this->belongsTo(PastLive::class);
    }

    /**
     * Messages from the currently-running broadcast (not yet archived).
     *
     * @param  Builder<LiveChatMessage>  $query
     */
    public function scopeLive(Builder $query): void
    {
        $query->whereNull('past_live_id')->where('is_moderated', false);
    }
}
