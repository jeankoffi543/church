<?php

namespace App\Services;

use App\Models\BibleVerse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

/**
 * Express Bible lookup engine for the Live Studio régie. Resolves a free-text
 * reference ("Jea 3:16", "Jean 3", "1 Cor 13:4") to a verse and pre-computes
 * the navigation targets (next verse, first verse of the next chapter) so the
 * console's arrow buttons never need a second round-trip.
 */
class BibleService
{
    private const TRANSLATION = 'LSG';

    /**
     * Get and cache verse texts for all requested versions.
     *
     * @param  array<int, string>  $versions
     * @return array<string, string>
     */
    public function getTextsForVerse(string $book, int $chapter, int $verse, array $versions): array
    {
        $sortedVersions = $versions;
        sort($sortedVersions);
        $versionsKey = implode(',', $sortedVersions);
        $cacheKey = "bible:verse:{$book}:{$chapter}:{$verse}:{$versionsKey}";

        return Cache::remember($cacheKey, now()->addHours(24), function () use ($book, $chapter, $verse, $versions) {
            return BibleVerse::query()
                ->whereIn('translation', $versions)
                ->where('book', $book)
                ->where('chapter', $chapter)
                ->where('verse', $verse)
                ->pluck('text', 'translation')
                ->all();
        });
    }

    /**
     * Resolve a query into a match + navigation targets + autocomplete suggestions.
     *
     * @param  array<int, string>  $versions
     * @return array{
     *   query: string,
     *   match: array<string, mixed>|null,
     *   next_verse: array<string, mixed>|null,
     *   next_chapter: array<string, mixed>|null,
     *   suggestions: array<int, array<string, mixed>>
     * }
     */
    public function search(string $query, array $versions = ['LSG']): array
    {
        $query = trim($query);
        [$bookToken, $chapter, $verse] = $this->parse($query);

        $baseTranslation = $versions[0] ?? self::TRANSLATION;
        $book = $bookToken !== null ? $this->resolveBook($bookToken, $baseTranslation) : null;

        $match = null;
        if ($book !== null) {
            $resolvedChapter = $chapter;
            $resolvedVerse = $verse;

            if ($chapter !== null) {
                $verseNumber = $verse ?? $this->firstVerseOfChapter($book, $chapter, $baseTranslation);
                if ($verseNumber !== null) {
                    $match = $this->find($book, $chapter, $verseNumber, $baseTranslation);
                } else {
                    // Fallback to first available verse of the book if chapter is not found
                    $firstAvailable = BibleVerse::query()
                        ->where('translation', $baseTranslation)
                        ->where('book', $book)
                        ->orderBy('chapter')
                        ->orderBy('verse')
                        ->first();
                    if ($firstAvailable) {
                        $match = $firstAvailable;
                        $resolvedChapter = $firstAvailable->chapter;
                        $resolvedVerse = $firstAvailable->verse;
                    }
                }
            }
        }

        return [
            'query' => $query,
            'match' => $this->present($match, $versions),
            'next_verse' => $match ? $this->present($this->find($match->book, $match->chapter, $match->verse + 1, $baseTranslation), $versions) : null,
            'next_chapter' => $match ? $this->present($this->firstVerseModelOfChapter($match->book, $match->chapter + 1, $baseTranslation), $versions) : null,
            'suggestions' => $this->suggest($bookToken, $book, $chapter, $verse, $versions)
                ->map(fn (BibleVerse $v): array => $this->present($v, $versions))
                ->all(),
        ];
    }

    /**
     * Navigate from an exact reference to a sibling verse / chapter.
     *
     * @param  array<int, string>  $versions
     * @return array<string, mixed>|null
     */
    public function relative(string $book, int $chapter, int $verse, string $direction, array $versions = ['LSG']): ?array
    {
        $baseTranslation = $versions[0] ?? self::TRANSLATION;
        $model = match ($direction) {
            'next_verse' => $this->find($book, $chapter, $verse + 1, $baseTranslation),
            'prev_verse' => $verse > 1 ? $this->find($book, $chapter, $verse - 1, $baseTranslation) : null,
            'next_chapter' => $this->firstVerseModelOfChapter($book, $chapter + 1, $baseTranslation),
            'prev_chapter' => $chapter > 1 ? $this->firstVerseModelOfChapter($book, $chapter - 1, $baseTranslation) : null,
            default => null,
        };

        return $this->present($model, $versions);
    }

    /**
     * Parse "Livre Chapitre[:Verset]" — tolerant of `:`, `.`, or a space
     * separator and of partial book names.
     *
     * @return array{0: string|null, 1: int|null, 2: int|null}
     */
    private function parse(string $query): array
    {
        if ($query === '') {
            return [null, null, null];
        }

        // Book token = leading letters (incl. a leading digit for "1 Corinthiens").
        if (preg_match('/^\s*(\d?\s*[\p{L}].*?)(?:\s+(\d+)(?:\s*[:.\s]\s*(\d+))?)?\s*$/u', $query, $m) !== 1) {
            return [trim($query), null, null];
        }

        return [
            trim($m[1]),
            isset($m[2]) && $m[2] !== '' ? (int) $m[2] : null,
            isset($m[3]) && $m[3] !== '' ? (int) $m[3] : null,
        ];
    }

    /**
     * Match a (possibly abbreviated, accent-insensitive) book token to a stored
     * book name. Prefers an exact match, then the shortest prefix match.
     */
    private function resolveBook(string $token, string $translation = self::TRANSLATION): ?string
    {
        $needle = $this->normalise($token);
        if ($needle === '') {
            return null;
        }

        // Get available books for this translation
        $books = $this->books($translation);

        // 1. Exact match in books database (Prioritized)
        $exact = $books->first(fn (string $b): bool => $this->normalise($b) === $needle);
        if ($exact !== null) {
            return $exact;
        }

        // 2. Prefix match in books database (Prioritized)
        $prefixMatch = $books
            ->filter(fn (string $b): bool => str_starts_with($this->normalise($b), $needle))
            ->sortBy(fn (string $b): int => mb_strlen($b))
            ->first();
        if ($prefixMatch !== null) {
            return $prefixMatch;
        }

        // 3. Fallback to dictionary of equivalent abbreviations and common names
        $dictionary = [
            'jan' => 'Jean', 'jean' => 'Jean', 'jhn' => 'Jean', 'jn' => 'Jean',
            'gen' => 'Genèse', 'genese' => 'Genèse', 'gn' => 'Genèse',
            'mat' => 'Matthieu', 'matthieu' => 'Matthieu', 'mt' => 'Matthieu',
            'luc' => 'Luc', 'lc' => 'Luc',
            'mar' => 'Marc', 'mc' => 'Marc', 'mr' => 'Marc',
            'act' => 'Actes', 'ac' => 'Actes',
            'rom' => 'Romains', 'ro' => 'Romains', 'rm' => 'Romains',
            'cor' => 'Corinthiens', '1cor' => '1 Corinthiens', '2cor' => '2 Corinthiens',
            'ps' => 'Psaumes', 'psa' => 'Psaumes', 'psaumes' => 'Psaumes',
            'ap' => 'Apocalypse', 'apo' => 'Apocalypse', 'rev' => 'Apocalypse',
            'es' => 'Ésaïe', 'isa' => 'Ésaïe', 'esaie' => 'Ésaïe',
            'jer' => 'Jérémie', 'lam' => 'Lamentations', 'eze' => 'Ézéchiel', 'dan' => 'Daniel',
            'os' => 'Osée', 'joel' => 'Joël', 'am' => 'Amos', 'ab' => 'Abdias',
            'jon' => 'Jonas', 'mic' => 'Michée', 'nah' => 'Nahum', 'hab' => 'Habacuc',
            'sop' => 'Sophonie', 'ag' => 'Aggée', 'zac' => 'Zacharie', 'mal' => 'Malachie',
            'gal' => 'Galates', 'eph' => 'Éphésiens', 'phi' => 'Philippiens', 'col' => 'Colossiens',
            'tim' => 'Timothée', 'tit' => 'Tite', 'phm' => 'Philémon', 'heb' => 'Hébreux',
            'jac' => 'Jacques', 'pet' => 'Pierre', 'jude' => 'Jude',
        ];

        // Normalise dictionary keys and map them to their resolved book
        $normDict = [];
        foreach ($dictionary as $key => $target) {
            $normDict[$this->normalise($key)] = $target;
        }

        $candidate = null;
        // Direct dictionary match
        if (isset($normDict[$needle])) {
            $candidate = $normDict[$needle];
        } else {
            // Dictionary prefix match
            foreach ($normDict as $key => $target) {
                if (str_starts_with($needle, $key) || str_starts_with($key, $needle)) {
                    $candidate = $target;
                    break;
                }
            }
        }

        if ($candidate !== null) {
            if ($books->contains($candidate)) {
                return $candidate;
            }

            // Attempt exact or prefix matches of normalized candidate
            $normCandidate = $this->normalise($candidate);
            $candidateExact = $books->first(fn (string $b): bool => $this->normalise($b) === $normCandidate);
            if ($candidateExact !== null) {
                return $candidateExact;
            }
            $candidatePrefix = $books
                ->filter(fn (string $b): bool => str_starts_with($this->normalise($b), $normCandidate))
                ->sortBy(fn (string $b): int => mb_strlen($b))
                ->first();
            if ($candidatePrefix !== null) {
                return $candidatePrefix;
            }

            $needle = $normCandidate;
        }

        // 4. Fallback to fuzzy Levenshtein match with up to 3 distance tolerance
        $bestMatch = null;
        $minDist = 999;
        foreach ($books as $b) {
            $normB = $this->normalise($b);
            $distWhole = levenshtein($needle, $normB);
            if ($distWhole < $minDist) {
                $minDist = $distWhole;
                $bestMatch = $b;
            }

            $len = mb_strlen($needle);
            if ($len > 2) {
                $prefixB = mb_substr($normB, 0, $len);
                $distPrefix = levenshtein($needle, $prefixB);
                if ($distPrefix < $minDist) {
                    $minDist = $distPrefix;
                    $bestMatch = $b;
                }
            }
        }

        if ($minDist <= 3 && $bestMatch !== null) {
            return $bestMatch;
        }

        return null;
    }

    /**
     * Autocomplete suggestions: verses around the current partial query.
     *
     * @param  array<int, string>  $versions
     * @return Collection<int, BibleVerse>
     */
    private function suggest(?string $bookToken, ?string $book, ?int $chapter, ?int $verse, array $versions = ['LSG']): Collection
    {
        $selectedTranslations = $versions;
        if (empty($selectedTranslations)) {
            $selectedTranslations = [self::TRANSLATION];
        }
        $baseTranslation = $selectedTranslations[0];

        if ($book === null) {
            // Still typing the book — surface a sample verse per matching book.
            $needle = $bookToken !== null ? $this->normalise($bookToken) : '';

            return $this->books($baseTranslation)
                ->when($needle !== '', fn (Collection $c) => $c->filter(fn (string $b): bool => str_contains($this->normalise($b), $needle)))
                ->take(8)
                ->flatMap(fn (string $b) => BibleVerse::query()
                    ->whereIn('translation', $selectedTranslations)
                    ->where('book', $b)
                    ->orderBy('chapter')
                    ->orderBy('verse')
                    ->get()
                    ->groupBy('translation')
                    ->map(fn ($group) => $group->first())
                    ->values()
                )
                ->filter()
                ->values();
        }

        $suggestions = BibleVerse::query()
            ->whereIn('translation', $selectedTranslations)
            ->where('book', $book)
            ->when($chapter !== null, fn ($q) => $q->where('chapter', $chapter))
            ->when($verse !== null, fn ($q) => $q->where('verse', '>=', $verse))
            ->orderBy('chapter')->orderBy('verse')
            ->limit(8 * count($selectedTranslations))
            ->get();

        // Fallback: if no suggestions found for this chapter, return any available verses of this book
        if ($suggestions->isEmpty() && $chapter !== null) {
            $suggestions = BibleVerse::query()
                ->whereIn('translation', $selectedTranslations)
                ->where('book', $book)
                ->orderBy('chapter')
                ->orderBy('verse')
                ->limit(8 * count($selectedTranslations))
                ->get();
        }

        return $suggestions;
    }

    private function find(string $book, int $chapter, int $verse, string $translation = self::TRANSLATION): ?BibleVerse
    {
        return BibleVerse::query()
            ->where('translation', $translation)
            ->where('book', $book)->where('chapter', $chapter)->where('verse', $verse)
            ->first();
    }

    private function firstVerseModelOfChapter(string $book, int $chapter, string $translation = self::TRANSLATION): ?BibleVerse
    {
        return BibleVerse::query()
            ->where('translation', $translation)
            ->where('book', $book)->where('chapter', $chapter)
            ->orderBy('verse')->first();
    }

    private function firstVerseOfChapter(string $book, int $chapter, string $translation = self::TRANSLATION): ?int
    {
        return $this->firstVerseModelOfChapter($book, $chapter, $translation)?->verse;
    }

    /**
     * @return Collection<int, string>
     */
    private function books(string $translation = self::TRANSLATION): Collection
    {
        $booksArray = Cache::remember("bible:books:{$translation}", now()->addHours(24), function () use ($translation) {
            return BibleVerse::query()
                ->where('translation', $translation)
                ->distinct()
                ->orderBy('book')
                ->pluck('book')
                ->all();
        });

        return collect($booksArray);
    }

    /**
     * Get dynamic list of unique translations from database.
     *
     * @return array<int, string>
     */
    public function getTranslations(): array
    {
        return Cache::remember('bible:translations', now()->addHours(24), function () {
            return BibleVerse::query()
                ->distinct()
                ->orderBy('translation')
                ->pluck('translation')
                ->all();
        });
    }

    /**
     * @param  array<int, string>  $versions
     * @return array<string, mixed>|null
     */
    private function present(?BibleVerse $verse, array $versions = ['LSG']): ?array
    {
        if ($verse === null) {
            return null;
        }

        $texts = $this->getTextsForVerse($verse->book, $verse->chapter, $verse->verse, $versions);

        return [
            'id' => $verse->id,
            'book' => $verse->book,
            'chapter' => $verse->chapter,
            'verse' => $verse->verse,
            'text' => $texts[$verse->translation] ?? $texts[$versions[0]] ?? $verse->text,
            'reference' => $verse->reference(),
            'translation' => $verse->translation,
            'texts' => $texts,
        ];
    }

    /** Lowercase + strip French accents for tolerant matching. */
    private function normalise(string $value): string
    {
        $value = mb_strtolower(trim($value));
        $value = strtr($value, [
            'à' => 'a', 'â' => 'a', 'ä' => 'a',
            'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e',
            'î' => 'i', 'ï' => 'i',
            'ô' => 'o', 'ö' => 'o',
            'ù' => 'u', 'û' => 'u', 'ü' => 'u',
            'ç' => 'c',
        ]);

        return preg_replace('/\s+/', ' ', $value) ?? $value;
    }
}
