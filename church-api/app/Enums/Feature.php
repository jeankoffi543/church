<?php

namespace App\Enums;

/**
 * Gate-able product features (feature-flipping). A tenant's active set comes
 * from its plan, with per-tenant overrides in `tenants.features` (add-ons /
 * grandfathering). Enforced by the `feature:` route middleware (CHR-140).
 */
enum Feature: string
{
    case CustomDomain = 'custom_domain';
    case Store = 'store';
    case Finances = 'finances';
    case Evangelism = 'evangelism';
    case FollowUps = 'followups';
    case Teams = 'teams';
    case Resources = 'resources';
    case Live = 'live';
    case Studio = 'studio';
    case MultiCampus = 'multi_campus';
    case Analytics = 'analytics';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $f): string => $f->value, self::cases());
    }
}
