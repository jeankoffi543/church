<?php

namespace App\Models;

use Database\Factories\EventFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property string $title
 * @property string $slug
 * @property string|null $type
 * @property string|null $description
 * @property string|null $location
 * @property string|null $host
 * @property Carbon $starts_at
 * @property Carbon|null $ends_at
 * @property string|null $image
 * @property array<int, string>|null $highlights
 * @property bool $is_featured
 */
class Event extends Model
{
    /** @use HasFactory<EventFactory> */
    use HasFactory;

    protected $fillable = [
        'title',
        'slug',
        'type',
        'description',
        'location',
        'host',
        'starts_at',
        'ends_at',
        'image',
        'highlights',
        'is_featured',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'highlights' => 'array',
            'is_featured' => 'boolean',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    /**
     * Events that have not finished yet (uses end date when present).
     *
     * @param  Builder<Event>  $query
     */
    public function scopeUpcoming(Builder $query): void
    {
        $query->where(function (Builder $q): void {
            $q->where('ends_at', '>=', now())
                ->orWhere(function (Builder $q2): void {
                    $q2->whereNull('ends_at')->where('starts_at', '>=', now());
                });
        });
    }

    /**
     * @param  Builder<Event>  $query
     */
    public function scopeChronological(Builder $query): void
    {
        $query->orderBy('starts_at');
    }
}
