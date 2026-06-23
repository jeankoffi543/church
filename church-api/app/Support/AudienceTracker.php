<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

/**
 * Anonymous live-audience counter backed by the cache (Redis in prod). Each
 * viewer is a short-lived heartbeat entry, so the count self-heals when a tab
 * closes without a clean "leave" (no drift / phantom viewers).
 */
final class AudienceTracker
{
    private const KEY = 'live:audience:count';

    /** Seconds a viewer is considered present without a fresh heartbeat. */
    private const TTL = 40;

    public static function touch(string $clientId): int
    {
        $map = self::pruned();
        $map[$clientId] = now()->timestamp;
        self::store($map);

        return count($map);
    }

    public static function leave(string $clientId): int
    {
        $map = self::pruned();
        unset($map[$clientId]);
        self::store($map);

        return count($map);
    }

    public static function count(): int
    {
        return count(self::pruned());
    }

    /**
     * @return array<string, int>
     */
    private static function pruned(): array
    {
        /** @var array<string, int> $map */
        $map = Cache::get(self::KEY, []);
        $cutoff = now()->timestamp - self::TTL;

        return array_filter($map, fn (int $seen): bool => $seen >= $cutoff);
    }

    /**
     * @param  array<string, int>  $map
     */
    private static function store(array $map): void
    {
        Cache::put(self::KEY, $map, now()->addSeconds(self::TTL * 3));
    }
}
