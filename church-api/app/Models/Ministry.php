<?php

namespace App\Models;

use Database\Factories\MinistryFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * @property string $name
 * @property string|null $description
 * @property string|null $schedule
 * @property int $sort_order
 * @property bool $is_active
 */
class Ministry extends Model
{
    /** @use HasFactory<MinistryFactory> */
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'schedule',
        'sort_order',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /**
     * First letter of the name, derived automatically.
     */
    public function initial(): string
    {
        return Str::upper(Str::substr($this->name, 0, 1));
    }

    /**
     * @param  Builder<Ministry>  $query
     */
    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }

    /**
     * @param  Builder<Ministry>  $query
     */
    public function scopeOrdered(Builder $query): void
    {
        $query->orderBy('sort_order')->orderBy('id');
    }
}
