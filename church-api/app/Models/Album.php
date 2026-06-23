<?php

namespace App\Models;

use Database\Factories\AlbumFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $title
 * @property string $slug
 * @property string|null $description
 * @property int|null $event_id
 * @property string|null $cover_image
 * @property Carbon $created_at
 */
class Album extends Model
{
    /** @use HasFactory<AlbumFactory> */
    use HasFactory;

    protected $fillable = [
        'title',
        'slug',
        'description',
        'event_id',
        'cover_image',
    ];

    /**
     * Photos belonging to this album, ordered by their explicit position.
     *
     * @return HasMany<AlbumPhoto, $this>
     */
    public function photos(): HasMany
    {
        return $this->hasMany(AlbumPhoto::class)->orderBy('order')->orderBy('id');
    }

    /**
     * The event this album documents (optional).
     *
     * @return BelongsTo<Event, $this>
     */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    /**
     * @param  Builder<Album>  $query
     */
    public function scopeLatestFirst(Builder $query): void
    {
        $query->orderByDesc('created_at')->orderByDesc('id');
    }
}
