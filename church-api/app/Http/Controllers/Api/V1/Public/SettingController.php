<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    /**
     * Return public settings as a `{ group: { key: value } }` map, or a single
     * group when `?group=` is provided. Powers the hero texts, weekly schedule,
     * offerings config, footer/contact, live config, etc.
     */
    public function index(Request $request): JsonResponse
    {
        if ($group = $request->string('group')->toString()) {
            return response()->json(['data' => Setting::group($group)]);
        }

        $grouped = Setting::query()
            ->get(['key', 'value', 'group'])
            ->groupBy('group')
            ->map(fn ($items) => $items->pluck('value', 'key'));

        return response()->json(['data' => $grouped]);
    }

    /**
     * Return the value of a single setting key.
     */
    public function show(string $key): JsonResponse
    {
        return response()->json(['data' => Setting::get($key)]);
    }
}
