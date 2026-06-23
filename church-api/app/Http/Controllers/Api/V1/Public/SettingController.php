<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    /**
     * Setting keys that must never be exposed on the public API (secrets).
     *
     * @var array<int, string>
     */
    private const HIDDEN = ['live_stream_key'];

    /**
     * Return public settings as a `{ group: { key: value } }` map, or a single
     * group when `?group=` is provided. Powers the hero texts, weekly schedule,
     * offerings config, footer/contact, live config, etc.
     */
    public function index(Request $request): JsonResponse
    {
        if ($group = $request->string('group')->toString()) {
            return response()->json(['data' => collect(Setting::group($group))->except(self::HIDDEN)]);
        }

        $grouped = Setting::query()
            ->whereNotIn('key', self::HIDDEN)
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
        abort_if(in_array($key, self::HIDDEN, true), 404);

        $value = Setting::get($key);

        if ($key === 'pastor_word_showcase' && is_array($value) && isset($value['user_id'])) {
            $user = User::find($value['user_id']);
            $value['user_name'] = $user ? $user->name : null;
        }

        if ($key === 'pastor_long_message' && is_array($value) && isset($value['preacher_id'])) {
            $user = User::with('roles')->find($value['preacher_id']);
            if ($user) {
                $value['preacher_name'] = $user->name;
                $value['preacher_role'] = $user->roles->first()?->name ?? 'Surintendant Régional MFM Ficgayo';

                // Initials
                $words = array_filter(explode(' ', $user->name));
                $initials = '';
                if (count($words) >= 2) {
                    $initials = mb_strtoupper(mb_substr(reset($words), 0, 1).mb_substr(end($words), 0, 1));
                } else {
                    $initials = mb_strtoupper(mb_substr($user->name, 0, 2));
                }
                $value['preacher_initials'] = $initials;
                $value['preacher_photo_path'] = null; // Associated profile image (null fallback as users table doesn't have it)
            }
        }

        if ($key === 'church_pastoral_team' && is_array($value) && isset($value['member_ids'])) {
            $userIds = $value['member_ids'];
            $users = User::with('roles')->whereIn('id', $userIds)->get()->keyBy('id');
            $avatars = $value['avatars'] ?? [];

            $orderedUsers = [];
            foreach ($userIds as $id) {
                if (isset($users[$id])) {
                    $user = $users[$id];

                    // Generate initials
                    $words = array_filter(explode(' ', $user->name));
                    $initials = '';
                    if (count($words) >= 2) {
                        $initials = mb_strtoupper(mb_substr(reset($words), 0, 1).mb_substr(end($words), 0, 1));
                    } else {
                        $initials = mb_strtoupper(mb_substr($user->name, 0, 2));
                    }

                    $orderedUsers[] = [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'role' => $user->roles->first()?->name ?? 'Serviteur',
                        'initials' => $initials,
                        'photo_path' => $avatars[$user->id] ?? null,
                    ];
                }
            }
            $value['pastors'] = $orderedUsers;
        }

        return response()->json(['data' => $value]);
    }
}
