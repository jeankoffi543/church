<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * How an identity relates to a church (CHR-166): merely following it, or a
 * claimed local member of it.
 */
enum MembershipStatus: string
{
    case Follower = 'follower';
    case Member = 'member';
}
