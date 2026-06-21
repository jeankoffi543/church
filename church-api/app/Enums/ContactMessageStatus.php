<?php

namespace App\Enums;

enum ContactMessageStatus: string
{
    case Pending = 'pending';
    case Read = 'read';
    case Archived = 'archived';
}
