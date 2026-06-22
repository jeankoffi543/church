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
 * @property Carbon $start_date
 * @property Carbon|null $end_date
 * @property string|null $image_path
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
        'start_date',
        'end_date',
        'image_path',
        'highlights',
        'is_featured',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'start_date' => 'datetime',
            'end_date' => 'datetime',
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
            $q->where('end_date', '>=', now())
                ->orWhere(function (Builder $q2): void {
                    $q2->whereNull('end_date')->where('start_date', '>=', now());
                });
        });
    }

    /**
     * @param  Builder<Event>  $query
     */
    public function scopeChronological(Builder $query): void
    {
        $query->orderBy('start_date');
    }
}
