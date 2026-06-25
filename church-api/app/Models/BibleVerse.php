<?php

namespace App\Models;

use Database\Factories\BibleVerseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * A single Bible verse, keyed by translation + book + chapter + verse.
 *
 * @property int $id
 * @property string $book
 * @property int $chapter
 * @property int $verse
 * @property string $text
 * @property string $translation
 */
class BibleVerse extends Model
{
    /** @use HasFactory<BibleVerseFactory> */
    use HasFactory;

    protected $fillable = [
        'book',
        'chapter',
        'verse',
        'text',
        'translation',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'chapter' => 'integer',
            'verse' => 'integer',
        ];
    }

    /**
     * Human reference such as "Jean 3:16".
     */
    public function reference(): string
    {
        return "{$this->book} {$this->chapter}:{$this->verse}";
    }
}
