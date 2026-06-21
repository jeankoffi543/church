<?php

namespace App\Models;

use Database\Factories\SettingFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

/**
 * Generic key-value setting. `value` is stored as JSON so it can hold a
 * scalar (string/number/bool) or a structure (array of schedule rows,
 * predefined amounts, social links…).
 *
 * @property string $key
 * @property mixed $value
 * @property string $group
 */
class Setting extends Model
{
    /** @use HasFactory<SettingFactory> */
    use HasFactory;

    protected $fillable = [
        'key',
        'value',
        'group',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'value' => 'array',
        ];
    }

    /**
     * Read a setting value by key.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        return static::query()->where('key', $key)->value('value') ?? $default;
    }

    /**
     * Create or update a setting value, keeping its group.
     */
    public static function set(string $key, mixed $value, string $group = 'general'): self
    {
        return static::query()->updateOrCreate(
            ['key' => $key],
            ['value' => $value, 'group' => $group],
        );
    }

    /**
     * Return every setting of a group as a flat key => value map.
     *
     * @return array<string, mixed>
     */
    public static function group(string $group): array
    {
        return static::query()
            ->where('group', $group)
            ->pluck('value', 'key')
            ->all();
    }

    protected static function booted(): void
    {
        // Settings are read-heavy; bust a light cache marker on write.
        static::saved(fn () => Cache::forget('settings.touch'));
        static::deleted(fn () => Cache::forget('settings.touch'));
    }
}
