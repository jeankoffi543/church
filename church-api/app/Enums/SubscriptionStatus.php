<?php

namespace App\Enums;

/**
 * Denormalised billing state mirrored onto the tenant from its subscription
 * (the authoritative subscription record lands in CHR-141).
 */
enum SubscriptionStatus: string
{
    case Trialing = 'trialing';
    case Active = 'active';
    case PastDue = 'past_due';
    case Suspended = 'suspended';
    case Canceled = 'canceled';
}
