<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\SettingsUpdateRequest;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\User;
use App\Http\Resources\V1\UserResource;
use App\Traits\HandlesFileUploads;
use Illuminate\Support\Facades\DB;

class SettingController extends Controller
{
    use HandlesFileUploads;

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
        return DB::transaction(function () use ($request) {
            $settings = $this->mapRequestUploadsToSettings($request, $request->validated('settings'));

            foreach ($settings as $item) {
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
        });
    }

    /**
     * GET current pastor word configuration and list of active users.
     */
    public function getPastorWord(Request $request): JsonResponse
    {
        $setting = Setting::get('pastor_word_showcase');
        $users = User::where('is_active', true)->orderBy('name')->get();

        return response()->json([
            'pastor_word' => $setting,
            'users' => UserResource::collection($users),
        ]);
    }

    /**
     * PUT/POST update pastor word configuration (including profile image upload).
     */
    public function updatePastorWord(Request $request): JsonResponse
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'custom_title' => 'nullable|string|max:255',
            'word' => 'required|string',
            'photo' => 'nullable|image|max:5120', // max 5MB
            'social_links' => 'nullable',
        ]);

        $existing = Setting::get('pastor_word_showcase') ?? [];
        $photoPath = $existing['photo_path'] ?? null;

        if ($request->hasFile('photo')) {
            if ($photoPath) {
                $this->deleteStoredFile($photoPath);
            }
            $file = $request->file('photo');
            $photoPath = $this->uploadSingleFile($file, 'pastor');
        }

        $socialLinks = $request->input('social_links', []);
        if (is_string($socialLinks)) {
            $socialLinks = json_decode($socialLinks, true) ?? [];
        }

        $value = [
            'user_id' => (int) $request->input('user_id'),
            'custom_title' => $request->input('custom_title'),
            'word' => $request->input('word'),
            'photo_path' => $photoPath,
            'social_links' => [
                'facebook' => $socialLinks['facebook'] ?? null,
                'instagram' => $socialLinks['instagram'] ?? null,
                'youtube' => $socialLinks['youtube'] ?? null,
            ],
        ];

        Setting::set('pastor_word_showcase', $value, 'pastor');

        return response()->json([
            'message' => 'Mot du Pasteur mis à jour avec succès.',
            'data' => $value,
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
