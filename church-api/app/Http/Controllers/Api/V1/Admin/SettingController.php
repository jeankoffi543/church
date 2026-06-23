<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\SettingsUpdateRequest;
use App\Http\Resources\V1\UserResource;
use App\Models\Setting;
use App\Models\User;
use App\Traits\HandlesFileUploads;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
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

            // Capture the live state before applying, to detect on/off transitions.
            $wasLive = (bool) Setting::get('live_status');

            foreach ($settings as $item) {
                Setting::set(
                    $item['key'],
                    $item['value'],
                    $item['group'] ?? 'general',
                );
            }

            // Going live → stamp the start time (chat time-offsets). Cutting the
            // live → archive metadata + chat into past_lives.
            $isLive = (bool) Setting::get('live_status');
            if ($isLive && ! $wasLive) {
                Setting::set('live_started_at', now()->toIso8601String(), 'live');
            } elseif (! $isLive && $wasLive) {
                Artisan::call('mfm:archive-live');
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
        $pastorWord = Setting::get('pastor_word_showcase');
        $banner = Setting::get('church_presentation_banner');
        $longMessage = Setting::get('pastor_long_message');
        $users = User::with('roles')->where('is_active', true)->orderBy('name')->get();

        return response()->json([
            'pastor_word' => $pastorWord,
            'church_presentation_banner' => $banner,
            'pastor_long_message' => $longMessage,
            'users' => UserResource::collection($users),
        ]);
    }

    /**
     * PUT/POST update pastor word configuration.
     */
    public function updatePastorWord(Request $request): JsonResponse
    {
        $request->validate([
            // pastor_word_showcase
            'user_id' => 'required|exists:users,id',
            'custom_title' => 'nullable|string|max:255',
            'word' => 'required|string',
            'photo' => 'nullable|image|max:5120', // max 5MB
            'social_links' => 'nullable',

            // church_presentation_banner
            'banner_eyebrow' => 'required|string|max:255',
            'banner_quote' => 'required|string',
            'banner_short_description' => 'required|string',
            'banner_button_text' => 'required|string|max:255',

            // pastor_long_message
            'preacher_id' => 'required|exists:users,id',
            'long_custom_eyebrow' => 'required|string|max:255',
            'long_custom_title' => 'required|string|max:255',
            'long_guarantees_title' => 'required|string',
            'long_guarantees_list' => 'required|string', // JSON list
            'long_html_content' => 'required|string',
        ]);

        // 1. Process pastor_word_showcase photo & links
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

        $pastorWordValue = [
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

        // 2. Process church_presentation_banner
        $bannerValue = [
            'eyebrow' => $request->input('banner_eyebrow'),
            'quote' => $request->input('banner_quote'),
            'short_description' => $request->input('banner_short_description'),
            'button_text' => $request->input('banner_button_text'),
        ];

        // 3. Process pastor_long_message
        $guarantees = json_decode($request->input('long_guarantees_list', '[]'), true) ?? [];

        $longMessageValue = [
            'preacher_id' => (int) $request->input('preacher_id'),
            'custom_eyebrow' => $request->input('long_custom_eyebrow'),
            'custom_title' => $request->input('long_custom_title'),
            'guarantees_title' => $request->input('long_guarantees_title'),
            'guarantees_list' => $guarantees,
            'html_content' => $request->input('long_html_content'),
        ];

        Setting::set('pastor_word_showcase', $pastorWordValue, 'pastor');
        Setting::set('church_presentation_banner', $bannerValue, 'eglise');
        Setting::set('pastor_long_message', $longMessageValue, 'eglise');

        return response()->json([
            'message' => 'Configuration du Pasteur et Présentation mise à jour avec succès.',
            'pastor_word' => $pastorWordValue,
            'church_presentation_banner' => $bannerValue,
            'pastor_long_message' => $longMessageValue,
        ]);
    }

    /**
     * GET current church pillars and pastoral team.
     */
    public function getChurchVision(Request $request): JsonResponse
    {
        $pillars = Setting::get('church_pillars_vision');
        $team = Setting::get('church_pastoral_team');
        $users = User::with('roles')->where('is_active', true)->orderBy('name')->get();

        return response()->json([
            'church_pillars_vision' => $pillars,
            'church_pastoral_team' => $team,
            'users' => UserResource::collection($users),
        ]);
    }

    public function updateChurchVision(Request $request): JsonResponse
    {
        // Decode JSON inputs if received as strings (multipart form-data support)
        $pillarsInput = $request->input('church_pillars_vision');
        if (is_string($pillarsInput)) {
            $pillarsInput = json_decode($pillarsInput, true);
        }

        $teamInput = $request->input('church_pastoral_team');
        if (is_string($teamInput)) {
            $teamInput = json_decode($teamInput, true);
        }

        $request->merge([
            'church_pillars_vision' => $pillarsInput,
            'church_pastoral_team' => $teamInput,
        ]);

        $request->validate([
            'church_pillars_vision' => 'required|array',
            'church_pillars_vision.title' => 'required|string|max:255',
            'church_pillars_vision.intro' => 'required|string',
            'church_pillars_vision.pillars' => 'required|array',
            'church_pillars_vision.pillars.*.title' => 'required|string|max:255',
            'church_pillars_vision.pillars.*.desc' => 'required|string',
            'church_pillars_vision.pillars.*.icon_name' => 'required|string|max:255', // Relaxed to allow any Lucide icon

            'church_pastoral_team' => 'required|array',
            'church_pastoral_team.title' => 'required|string|max:255',
            'church_pastoral_team.intro' => 'required|string',
            'church_pastoral_team.member_ids' => 'required|array',
            'church_pastoral_team.member_ids.*' => 'required|integer|exists:users,id',
        ]);

        $pillarsValue = [
            'title' => $request->input('church_pillars_vision.title'),
            'intro' => $request->input('church_pillars_vision.intro'),
            'pillars' => $request->input('church_pillars_vision.pillars'),
        ];

        // Process avatars
        $existingTeam = Setting::get('church_pastoral_team') ?? [];
        $avatars = $existingTeam['avatars'] ?? [];

        // Handle deleted avatars
        $deletedAvatars = $request->input('deleted_avatars', []);
        if (is_string($deletedAvatars)) {
            $deletedAvatars = json_decode($deletedAvatars, true) ?? [];
        }
        foreach ($deletedAvatars as $userId) {
            if (isset($avatars[$userId])) {
                $this->deleteStoredFile($avatars[$userId]);
                unset($avatars[$userId]);
            }
        }

        // Handle uploaded files: name format avatar_{id}
        $memberIds = array_map('intval', $request->input('church_pastoral_team.member_ids', []));
        foreach ($memberIds as $userId) {
            $fileKey = 'avatar_'.$userId;
            if ($request->hasFile($fileKey)) {
                if (isset($avatars[$userId])) {
                    $this->deleteStoredFile($avatars[$userId]);
                }
                $file = $request->file($fileKey);
                $path = $this->uploadSingleFile($file, 'pastors');
                $avatars[$userId] = $path;
            }
        }

        // Keep only active member_ids avatars
        $filteredAvatars = [];
        foreach ($memberIds as $userId) {
            if (isset($avatars[$userId])) {
                $filteredAvatars[$userId] = $avatars[$userId];
            }
        }

        $teamValue = [
            'title' => $request->input('church_pastoral_team.title'),
            'intro' => $request->input('church_pastoral_team.intro'),
            'member_ids' => $memberIds,
            'avatars' => $filteredAvatars,
        ];

        Setting::set('church_pillars_vision', $pillarsValue, 'eglise');
        Setting::set('church_pastoral_team', $teamValue, 'eglise');

        return response()->json([
            'message' => 'Vision de l\'église et équipe pastorale mises à jour avec succès.',
            'church_pillars_vision' => $pillarsValue,
            'church_pastoral_team' => $teamValue,
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
