<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Member;
use App\Models\Sermon;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\JsonResponse;

/**
 * First-run onboarding checklist for a new church (CHR-178). Each step is derived
 * from the church's own data, so it ticks off on its own as the admin sets things
 * up; the whole card can be dismissed once they're comfortable.
 */
class OnboardingController extends Controller
{
    public function show(): JsonResponse
    {
        $steps = [
            $this->step('account', 'Compte administrateur créé', User::query()->exists(), '/admins/dashboard'),
            $this->step('profile', 'Personnaliser votre église', Setting::query()->where('group', 'general')->exists(), '/admins/settings'),
            $this->step('members', 'Ajouter vos premiers fidèles', Member::query()->exists(), '/admins/members'),
            $this->step('content', 'Publier une prédication ou un événement', Sermon::query()->exists() || Event::query()->exists(), '/admins/sermons'),
            $this->step('team', 'Inviter un serviteur', User::query()->count() > 1, '/admins/users'),
        ];

        $completed = count(array_filter($steps, fn (array $step): bool => $step['done']));

        return response()->json(['data' => [
            'steps' => $steps,
            'completed' => $completed,
            'total' => count($steps),
            'dismissed' => (bool) Setting::get('onboarding_dismissed', false),
        ]]);
    }

    public function dismiss(): JsonResponse
    {
        Setting::set('onboarding_dismissed', true, 'general');

        return response()->json(['data' => ['dismissed' => true]]);
    }

    /**
     * @return array{key: string, label: string, done: bool, href: string}
     */
    private function step(string $key, string $label, bool $done, string $href): array
    {
        return ['key' => $key, 'label' => $label, 'done' => $done, 'href' => $href];
    }
}
