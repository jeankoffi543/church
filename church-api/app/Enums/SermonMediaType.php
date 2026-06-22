<?php

namespace App\Enums;

enum SermonMediaType: string
{
    case VideoUrl = 'video_url';
    case VideoFile = 'video_file';
    case AudioUrl = 'audio_url';
    case AudioFile = 'audio_file';

    /** Whether this type is backed by an uploaded file (vs an external URL). */
    public function isFile(): bool
    {
        return str_ends_with($this->value, '_file');
    }

    /** Whether this type is audio (vs video). */
    public function isAudio(): bool
    {
        return str_starts_with($this->value, 'audio_');
    }
}
