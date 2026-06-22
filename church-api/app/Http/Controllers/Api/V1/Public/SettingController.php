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
        $value = Setting::get($key);

        if ($key === 'pastor_word_showcase' && is_array($value) && isset($value['user_id'])) {
            $user = \App\Models\User::find($value['user_id']);
            $value['user_name'] = $user ? $user->name : null;
        }

        if ($key === 'pastor_long_message' && is_array($value) && isset($value['preacher_id'])) {
            $user = \App\Models\User::with('roles')->find($value['preacher_id']);
            if ($user) {
                $value['preacher_name'] = $user->name;
                $value['preacher_role'] = $user->roles->first()?->name ?? 'Surintendant Régional MFM Ficgayo';
                
                // Initials
                $words = array_filter(explode(' ', $user->name));
                $initials = '';
                if (count($words) >= 2) {
                    $initials = mb_strtoupper(mb_substr(reset($words), 0, 1) . mb_substr(end($words), 0, 1));
                } else {
                    $initials = mb_strtoupper(mb_substr($user->name, 0, 2));
                }
                $value['preacher_initials'] = $initials;
                $value['preacher_photo_path'] = null; // Associated profile image (null fallback as users table doesn't have it)
            }
        }

        return response()->json(['data' => $value]);
    }
}
