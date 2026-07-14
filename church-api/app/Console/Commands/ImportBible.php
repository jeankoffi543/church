<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

/**
 * Bulk-load a full Bible into `bible_verses` from a JSON file.
 *
 * Accepts either a flat array:
 *   [{ "book": "Jean", "chapter": 3, "verse": 16, "text": "..." }, ...]
 * or a nested map:
 *   { "Jean": { "3": { "16": "..." } } }
 */
class ImportBible extends Command
{
    protected $signature = 'bible:import {translation : Code de la version (ex: LSG, BDS)}
                            {file : Path to the Bible JSON file}
                            {--truncate : Empty the table for this translation first}';

    protected $description = 'Import a full Bible (book/chapter/verse/text) from a JSON file';

    public function handle(): int
    {
        $translation = (string) $this->argument('translation');
        $path = (string) $this->argument('file');

        if (! File::exists($path)) {
            $this->error("File not found: {$path}");

            return self::FAILURE;
        }

        $decoded = json_decode(File::get($path), true);
        if (! is_array($decoded)) {
            $this->error('Invalid JSON: expected an array or object.');

            return self::FAILURE;
        }

        $rows = $this->normalise($decoded, $translation);

        if ($rows === []) {
            $this->error('No verses found in the file.');

            return self::FAILURE;
        }

        $this->info('Starting SQL transaction for '.count($rows)." verses ({$translation})...");

        DB::beginTransaction();

        try {
            if ($this->option('truncate')) {
                $this->info("Deleting previous verses for translation {$translation}...");
                DB::table('bible_verses')->where('translation', $translation)->delete();
            }

            $now = now();
            $count = 0;
            foreach (array_chunk($rows, 1000) as $chunk) {
                $chunk = array_map(static fn (array $r): array => $r + ['created_at' => $now, 'updated_at' => $now], $chunk);

                if ($this->option('truncate')) {
                    DB::table('bible_verses')->insert($chunk);
                } else {
                    DB::table('bible_verses')->upsert($chunk, ['translation', 'book', 'chapter', 'verse'], ['text', 'updated_at']);
                }

                $count += count($chunk);
                $this->output->write('.');
            }

            DB::commit();
            $this->newLine();

            // Clear cache for translations list and books list for this translation
            Cache::forget('bible:translations');
            Cache::forget("bible:books:{$translation}");

            $this->info("Imported {$count} verses ({$translation}) successfully.");

            return self::SUCCESS;
        } catch (\Exception $e) {
            DB::rollBack();
            $this->newLine();
            $this->error('Database transaction rolled back. Error: '.$e->getMessage());

            return self::FAILURE;
        }
    }

    private function normalise(array $decoded, string $translation): array
    {
        $rows = [];

        // 1. Flat array of verse objects.
        if (array_is_list($decoded) && isset($decoded[0]['book'], $decoded[0]['chapter'], $decoded[0]['verse'], $decoded[0]['text'])) {
            foreach ($decoded as $row) {
                if (! is_array($row) || ! isset($row['book'], $row['chapter'], $row['verse'], $row['text'])) {
                    continue;
                }
                $rows[] = [
                    'book' => (string) $row['book'],
                    'chapter' => (int) $row['chapter'],
                    'verse' => (int) $row['verse'],
                    'text' => (string) $row['text'],
                    'translation' => (string) ($row['translation'] ?? $translation),
                ];
            }

            return $rows;
        }

        // 2. Single book with "chapters" key at the root.
        if (isset($decoded['chapters']) && is_array($decoded['chapters'])) {
            $bookName = $decoded['name'] ?? 'Genèse'; // Fallback to Genèse as per the file context
            foreach ($decoded['chapters'] as $chapterObj) {
                if (! is_array($chapterObj) || ! isset($chapterObj['chapter'], $chapterObj['verses']) || ! is_array($chapterObj['verses'])) {
                    continue;
                }
                $chapterNum = (int) $chapterObj['chapter'];
                foreach ($chapterObj['verses'] as $verseObj) {
                    if (! is_array($verseObj) || ! isset($verseObj['verse'], $verseObj['text'])) {
                        continue;
                    }
                    $rows[] = [
                        'book' => (string) $bookName,
                        'chapter' => $chapterNum,
                        'verse' => (int) $verseObj['verse'],
                        'text' => (string) $verseObj['text'],
                        'translation' => $translation,
                    ];
                }
            }

            return $rows;
        }

        // 3. Array of books containing "chapters".
        if (array_is_list($decoded) && isset($decoded[0]['chapters']) && is_array($decoded[0]['chapters'])) {
            foreach ($decoded as $bookObj) {
                if (! is_array($bookObj) || ! isset($bookObj['name'], $bookObj['chapters']) || ! is_array($bookObj['chapters'])) {
                    continue;
                }
                $bookName = $bookObj['name'];
                foreach ($bookObj['chapters'] as $chapterObj) {
                    if (! is_array($chapterObj) || ! isset($chapterObj['chapter'], $chapterObj['verses']) || ! is_array($chapterObj['verses'])) {
                        continue;
                    }
                    $chapterNum = (int) $chapterObj['chapter'];
                    foreach ($chapterObj['verses'] as $verseObj) {
                        if (! is_array($verseObj) || ! isset($verseObj['verse'], $verseObj['text'])) {
                            continue;
                        }
                        $rows[] = [
                            'book' => (string) $bookName,
                            'chapter' => $chapterNum,
                            'verse' => (int) $verseObj['verse'],
                            'text' => (string) $verseObj['text'],
                            'translation' => $translation,
                        ];
                    }
                }
            }

            return $rows;
        }

        // 4. Nested { book: { chapter: { verse: text } } }.
        foreach ($decoded as $book => $chapters) {
            if (! is_array($chapters)) {
                continue;
            }
            foreach ($chapters as $chapter => $vs) {
                if (! is_array($vs)) {
                    continue;
                }
                foreach ($vs as $verse => $text) {
                    if (is_array($text)) {
                        continue;
                    }
                    $rows[] = [
                        'book' => (string) $book,
                        'chapter' => (int) $chapter,
                        'verse' => (int) $verse,
                        'text' => (string) $text,
                        'translation' => $translation,
                    ];
                }
            }
        }

        return $rows;
    }
}
