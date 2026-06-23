<?php

namespace App\Enums;

enum DonationStatus: string
{
    case Pending = 'pending';
    case Success = 'success';
    case Failed = 'failed';
}
