<?php

namespace App\Enums;

enum VideoSourceType: string
{
    /** Captured automatically when an admin cut the live (chat replay available). */
    case LiveArchive = 'live_archive';

    /** A video file/URL produced and uploaded asynchronously by an admin. */
    case Upload = 'upload';
}
