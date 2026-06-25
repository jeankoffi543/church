<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Services\BibleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BibleController extends Controller
{
    public function __construct(private readonly BibleService $bible) {}

    /**
     * Express reference lookup with autocomplete + navigation targets.
     * GET /api/v1/public/bible/search?q=Jean 3:16
     */
    public function search(Request $request): JsonResponse
    {
        $query = (string) $request->validate([
            'q' => ['required', 'string', 'max:120'],
        ])['q'];

        $versionsInput = $request->input('translations') ?? $request->input('versions');
        $versions = ['LS1910']; // Par défaut
        if (!empty($versionsInput)) {
            if (is_array($versionsInput)) {
                $versions = array_map('strval', $versionsInput);
            } elseif (is_string($versionsInput)) {
                $versions = array_filter(array_map('trim', explode(',', $versionsInput)));
            }
        }

        return response()->json(['data' => $this->bible->search($query, $versions)]);
    }

    /**
     * Resolve a sibling reference for the régie's arrow buttons.
     * GET /api/v1/public/bible/navigate?book=Jean&chapter=3&verse=16&direction=next_verse
     */
    public function navigate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'book' => ['required', 'string', 'max:60'],
            'chapter' => ['required', 'integer', 'min:1'],
            'verse' => ['required', 'integer', 'min:1'],
            'direction' => ['required', 'in:next_verse,prev_verse,next_chapter,prev_chapter'],
        ]);

        $versionsInput = $request->input('translations') ?? $request->input('versions');
        $versions = ['LS1910']; // Par défaut
        if (!empty($versionsInput)) {
            if (is_array($versionsInput)) {
                $versions = array_map('strval', $versionsInput);
            } elseif (is_string($versionsInput)) {
                $versions = array_filter(array_map('trim', explode(',', $versionsInput)));
            }
        }

        return response()->json([
            'data' => $this->bible->relative($data['book'], (int) $data['chapter'], (int) $data['verse'], $data['direction'], $versions),
        ]);
    }

    /**
     * Get unique list of translations available in database.
     * GET /api/v1/public/bible/translations
     */
    public function translations(): JsonResponse
    {
        return response()->json(['data' => $this->bible->getTranslations()]);
    }
}
