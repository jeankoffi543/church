<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Events\ScriptureStreamEvent;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\ScriptureBroadcastRequest;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The régie console's backend: pushes scripture overlays to the live channel
 * and persists the réalisateur's "prepared verses" deck.
 */
class LiveScriptureController extends Controller
{
    private const CURRENT_KEY = 'live_current_scripture';

    private const PREPARED_KEY = 'live_prepared_verses';

    private const DEFAULT_SETTINGS = [
        'layout' => 'lower_third',
        'animation' => 'fade_slide',
        'font' => 'Cormorant Garamond',
        'background' => 'gradient_purple',
        'duration' => 0,
    ];

    /**
     * Show or hide a verse overlay on every viewer's screen.
     */
    public function broadcast(ScriptureBroadcastRequest $request): JsonResponse
    {
        $action = (string) $request->validated('action');
        $verse = $action === 'show' ? (array) $request->validated('verse') : [];
        $settings = $action === 'show'
            ? array_merge(self::DEFAULT_SETTINGS, (array) ($request->validated('settings') ?? []))
            : [];

        // Persist the current overlay so viewers joining mid-stream catch up.
        Setting::set(self::CURRENT_KEY, [
            'action' => $action,
            'verse' => $verse,
            'settings' => $settings,
            'at' => now()->toIso8601String(),
        ], 'live');

        broadcast(new ScriptureStreamEvent($action, $verse, $settings));

        return response()->json(['data' => ['action' => $action]]);
    }

    /**
     * The prepared-verses deck (read).
     */
    public function prepared(): JsonResponse
    {
        return response()->json(['data' => $this->normalisePrepared(Setting::get(self::PREPARED_KEY, []))]);
    }

    /**
     * Replace the prepared-verses deck in one call.
     */
    public function updatePrepared(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'verses' => ['present', 'array'],
            'verses.*.reference' => ['required', 'string', 'max:120'],
            'verses.*.text' => ['nullable', 'string', 'max:2000'],
            'verses.*.texts' => ['nullable', 'array'],
            'verses.*.book' => ['nullable', 'string', 'max:60'],
            'verses.*.chapter' => ['nullable', 'integer', 'min:1'],
            'verses.*.verse' => ['nullable', 'integer', 'min:1'],
        ]);

        $verses = $this->normalisePrepared($validated['verses']);
        Setting::set(self::PREPARED_KEY, $verses, 'live');

        return response()->json(['data' => $verses]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function normalisePrepared(mixed $raw): array
    {
        if (! is_array($raw)) {
            return [];
        }

        return array_values(array_map(static fn (array $v): array => [
            'reference' => (string) ($v['reference'] ?? ''),
            'text' => (string) ($v['text'] ?? ''),
            'texts' => $v['texts'] ?? null,
            'book' => $v['book'] ?? null,
            'chapter' => isset($v['chapter']) ? (int) $v['chapter'] : null,
            'verse' => isset($v['verse']) ? (int) $v['verse'] : null,
        ], array_filter($raw, 'is_array')));
    }
}
