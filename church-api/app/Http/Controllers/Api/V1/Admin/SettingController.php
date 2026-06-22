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
     * Delete a single setting by key.
     */
    public function destroy(string $key): JsonResponse
    {
        Setting::query()->where('key', $key)->delete();

        return response()->json(status: 204);
    }
}
