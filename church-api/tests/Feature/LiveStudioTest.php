<?php

use App\Events\ScriptureStreamEvent;
use App\Models\BibleVerse;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\getJson;

function seedVerses(): void
{
    BibleVerse::factory()->createMany([
        ['book' => 'Jean', 'chapter' => 3, 'verse' => 16, 'text' => 'Car Dieu a tant aimé le monde…', 'translation' => 'LS1910'],
        ['book' => 'Jean', 'chapter' => 3, 'verse' => 17, 'text' => 'Dieu, en effet, n’a pas envoyé…', 'translation' => 'LS1910'],
        ['book' => 'Jean', 'chapter' => 4, 'verse' => 1, 'text' => 'Le Seigneur sut…', 'translation' => 'LS1910'],
    ]);
}

function liveAdmin(): User
{
    $admin = User::factory()->create();
    $role = Role::findOrCreate('Régisseur', 'web');
    $role->givePermissionTo(Permission::findOrCreate('manage_live', 'web'));
    $admin->assignRole($role);

    return $admin;
}

it('resolves an abbreviated reference with navigation targets', function () {
    seedVerses();

    $data = getJson('/api/v1/public/bible/search?q='.urlencode('Jea 3:16'))
        ->assertOk()
        ->json('data');

    expect($data['match']['reference'])->toBe('Jean 3:16')
        ->and($data['next_verse']['reference'])->toBe('Jean 3:17')
        ->and($data['next_chapter']['reference'])->toBe('Jean 4:1');
});

it('navigates to a sibling verse', function () {
    seedVerses();

    getJson('/api/v1/public/bible/navigate?book=Jean&chapter=3&verse=16&direction=next_verse')
        ->assertOk()
        ->assertJsonPath('data.reference', 'Jean 3:17');
});

it('broadcasts a scripture overlay and persists the current state', function () {
    Event::fake([ScriptureStreamEvent::class]);

    actingAs(liveAdmin(), 'sanctum')
        ->postJson('/api/v1/admin/live/scripture', [
            'action' => 'show',
            'verse' => ['reference' => 'Jean 3:16', 'text' => 'Car Dieu…'],
            'settings' => ['layout' => 'full_screen', 'animation' => 'typewriter'],
        ])
        ->assertOk()
        ->assertJsonPath('data.action', 'show');

    Event::assertDispatched(ScriptureStreamEvent::class, fn (ScriptureStreamEvent $e) => $e->action === 'show'
        && $e->verse['reference'] === 'Jean 3:16'
        && $e->settings['layout'] === 'full_screen');

    // Late joiners can catch up via the public endpoint.
    getJson('/api/v1/public/live/scripture')
        ->assertOk()
        ->assertJsonPath('data.action', 'show')
        ->assertJsonPath('data.verse.reference', 'Jean 3:16');
});

it('hides the overlay', function () {
    Event::fake([ScriptureStreamEvent::class]);
    Setting::set('live_current_scripture', ['action' => 'show', 'verse' => ['reference' => 'Jean 3:16']], 'live');

    actingAs(liveAdmin(), 'sanctum')
        ->postJson('/api/v1/admin/live/scripture', ['action' => 'hide'])
        ->assertOk();

    Event::assertDispatched(ScriptureStreamEvent::class, fn (ScriptureStreamEvent $e) => $e->action === 'hide');

    getJson('/api/v1/public/live/scripture')->assertOk()->assertJsonPath('data.action', 'hide');
});

it('forbids broadcasting without the manage_live permission', function () {
    $user = User::factory()->create();

    actingAs($user, 'sanctum')
        ->postJson('/api/v1/admin/live/scripture', ['action' => 'hide'])
        ->assertForbidden();
});

it('stores and returns the prepared-verses deck', function () {
    $admin = liveAdmin();

    actingAs($admin, 'sanctum')
        ->putJson('/api/v1/admin/live/scripture/prepared', [
            'verses' => [
                ['reference' => 'Jean 3:16', 'text' => 'Car Dieu…', 'book' => 'Jean', 'chapter' => 3, 'verse' => 16],
                ['reference' => 'Psaumes 23:1', 'text' => 'L’Éternel est mon berger…'],
            ],
        ])
        ->assertOk()
        ->assertJsonCount(2, 'data');

    actingAs($admin, 'sanctum')
        ->getJson('/api/v1/admin/live/scripture/prepared')
        ->assertOk()
        ->assertJsonPath('data.0.reference', 'Jean 3:16');
});
