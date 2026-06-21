<?php

namespace App\Models;

use Database\Factories\MinistryFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * @property string $name
 * @property int|null $chef_id
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
        'image',
        'chef_id',
        'description',
        'schedule',
        'sort_order',
        'is_active',
    ];

    /**
     * The user designated as the leader of this ministry.
     *
     * @return BelongsTo<User, $this>
     */
    public function chef(): BelongsTo
    {
        return $this->belongsTo(User::class, 'chef_id');
    }

    /**
     * Recruitment applications submitted for this ministry.
     *
     * @return HasMany<MinistryApplication, $this>
     */
    public function applications(): HasMany
    {
        return $this->hasMany(MinistryApplication::class);
    }

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
