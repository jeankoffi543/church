<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\SettingsUpdateRequest;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    /**
     * All settings grouped by `group`, for the backoffice configuration panels.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Setting::query()
            ->when($request->filled('group'), fn ($q) => $q->where('group', $request->string('group')));

        $grouped = $query->get(['key', 'value', 'group'])
            ->groupBy('group')
            ->map(fn ($items) => $items->pluck('value', 'key'));

        return response()->json(['data' => $grouped]);
    }

    /**
     * Bulk create/update settings. Each item upserts by `key`.
     */
    public function update(SettingsUpdateRequest $request): JsonResponse
    {
        foreach ($request->validated('settings') as $item) {
            Setting::set(
                $item['key'],
                $item['value'],
                $item['group'] ?? 'general',
            );
        }

        return response()->json([
            'message' => 'Paramètres mis à jour.',
            'data' => Setting::query()->get(['key', 'value', 'group'])
                ->groupBy('group')
                ->map(fn ($items) => $items->pluck('value', 'key')),
        ]);
    }

    /**
     * Delete a single setting by key.
     */
    public function destroy(string $key): JsonResponse
    {
        Setting::query()->where('key', $key)->delete();

        return response()->json(status: 204);
    }
}
