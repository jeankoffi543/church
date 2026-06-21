<?php

use App\Enums\MinistryApplicationStatus;
use App\Models\Ministry;
use App\Models\MinistryApplication;
use App\Models\User;
use App\Support\AccessControl;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Permission::findOrCreate('validate_ministry_applications', 'web');
});

/* ── Public submission ─────────────────────────────────────────────── */

it('accepts a public ministry application', function () {
    $ministry = Ministry::factory()->create(['is_active' => true]);

    $this->postJson('/api/v1/public/ministries/applications', [
        'name' => 'Jean Koffi',
        'email' => 'jean@example.com',
        'phone' => '+2250700000000',
        'ministry_id' => $ministry->id,
        'motivation' => 'Je veux servir dans la louange.',
    ])->assertCreated();

    $application = MinistryApplication::first();
    expect($application)->not->toBeNull()
        ->and($application->status)->toBe(MinistryApplicationStatus::Pending);
});

it('validates the public application payload', function () {
    $this->postJson('/api/v1/public/ministries/applications', [])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['name', 'email', 'phone', 'ministry_id', 'motivation']);
});

it('rejects an application for an inactive ministry', function () {
    $ministry = Ministry::factory()->create(['is_active' => false]);

    $this->postJson('/api/v1/public/ministries/applications', [
        'name' => 'Jean', 'email' => 'j@e.co', 'phone' => '0700',
        'ministry_id' => $ministry->id, 'motivation' => 'Servir.',
    ])->assertStatus(422)->assertJsonValidationErrors('ministry_id');
});

it('returns the existing status instead of duplicating an application', function () {
    $ministry = Ministry::factory()->create(['is_active' => true]);
    MinistryApplication::factory()->create([
        'ministry_id' => $ministry->id,
        'email' => 'jean@example.com',
        'status' => MinistryApplicationStatus::Pending,
    ]);

    $this->postJson('/api/v1/public/ministries/applications', [
        'name' => 'Jean Koffi',
        'email' => 'jean@example.com',
        'phone' => '+2250700000000',
        'ministry_id' => $ministry->id,
        'motivation' => 'Je veux encore servir.',
    ])
        ->assertOk()
        ->assertJsonPath('created', false)
        ->assertJsonPath('status', 'pending');

    expect(MinistryApplication::where('ministry_id', $ministry->id)->count())->toBe(1);
});

it('reveals the motif to the candidate only when marked public', function () {
    $ministry = Ministry::factory()->create();

    // Public note → revealed.
    MinistryApplication::factory()->approved()->create([
        'ministry_id' => $ministry->id,
        'email' => 'visible@example.com',
        'decision_note' => 'Bienvenue dans l\'équipe louange !',
        'decision_note_public' => true,
    ]);

    // Private note → hidden.
    MinistryApplication::factory()->rejected()->create([
        'ministry_id' => $ministry->id,
        'email' => 'hidden@example.com',
        'decision_note' => 'Note interne confidentielle.',
        'decision_note_public' => false,
    ]);

    $this->postJson('/api/v1/public/ministries/applications/status', ['contact' => 'visible@example.com'])
        ->assertOk()
        ->assertJsonPath('data.0.decision_note', 'Bienvenue dans l\'équipe louange !');

    $this->postJson('/api/v1/public/ministries/applications/status', ['contact' => 'hidden@example.com'])
        ->assertOk()
        ->assertJsonPath('data.0.decision_note', null);
});

it('stores the motif visibility flag on a decision', function () {
    actingAsSuperAdmin();
    $application = MinistryApplication::factory()->create();

    $this->postJson("/api/v1/admin/ministry-applications/{$application->id}/approve", [
        'decision_note' => 'Affecté à la chorale.',
        'decision_note_public' => true,
    ])
        ->assertOk()
        ->assertJsonPath('data.decision_note_public', true);

    expect($application->fresh()->decision_note_public)->toBeTrue();
});

it('lets a candidate check their status by email', function () {
    $ministry = Ministry::factory()->create(['name' => 'Louange']);
    MinistryApplication::factory()->approved()->create([
        'ministry_id' => $ministry->id,
        'email' => 'paul@example.com',
    ]);

    $this->postJson('/api/v1/public/ministries/applications/status', [
        'contact' => 'paul@example.com',
    ])
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.status', 'approved')
        ->assertJsonPath('data.0.ministry', 'Louange');
});

it('matches a phone status lookup despite spacing', function () {
    $ministry = Ministry::factory()->create();
    MinistryApplication::factory()->create([
        'ministry_id' => $ministry->id,
        'phone' => '+225 07 00 11 22 33',
    ]);

    $this->postJson('/api/v1/public/ministries/applications/status', [
        'contact' => '+2250700112233',
    ])
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

it('returns an empty status list for an unknown contact', function () {
    $this->postJson('/api/v1/public/ministries/applications/status', [
        'contact' => 'inconnu@example.com',
    ])->assertOk()->assertJsonCount(0, 'data');
});

/* ── Admin listing gating ──────────────────────────────────────────── */

it('blocks listing applications without the permission', function () {
    actingAsAdminWith(['manage_settings']);

    $this->getJson('/api/v1/admin/ministry-applications')->assertForbidden();
});

it('lets a global validator list every application', function () {
    actingAsSuperAdmin();
    MinistryApplication::factory()->count(3)->create();

    $this->getJson('/api/v1/admin/ministry-applications')
        ->assertOk()
        ->assertJsonCount(3, 'data');
});

it('scopes the listing to the chief own ministry', function () {
    $chief = User::factory()->create();
    Role::findOrCreate(AccessControl::MINISTRY_CHIEF, 'web');
    $chief->givePermissionTo('validate_ministry_applications');
    $chief->assignRole(AccessControl::MINISTRY_CHIEF);

    $mine = Ministry::factory()->create(['chef_id' => $chief->id]);
    $other = Ministry::factory()->create();
    MinistryApplication::factory()->count(2)->create(['ministry_id' => $mine->id]);
    MinistryApplication::factory()->count(3)->create(['ministry_id' => $other->id]);

    Sanctum::actingAs($chief);

    $this->getJson('/api/v1/admin/ministry-applications')
        ->assertOk()
        ->assertJsonCount(2, 'data');
});

/* ── Approve / reject + contextual chief rule ──────────────────────── */

it('lets a global validator approve any application', function () {
    actingAsSuperAdmin();
    $application = MinistryApplication::factory()->create();

    $this->postJson("/api/v1/admin/ministry-applications/{$application->id}/approve")
        ->assertOk()
        ->assertJsonPath('data.status', 'approved');

    expect($application->fresh()->status)->toBe(MinistryApplicationStatus::Approved);
});

it('records a decision note (motif) when rejecting', function () {
    actingAsSuperAdmin();
    $application = MinistryApplication::factory()->create();

    $this->postJson("/api/v1/admin/ministry-applications/{$application->id}/reject", [
        'decision_note' => 'Profil intéressant mais plus de place cette saison.',
    ])
        ->assertOk()
        ->assertJsonPath('data.decision_note', 'Profil intéressant mais plus de place cette saison.');

    expect($application->fresh()->decision_note)
        ->toBe('Profil intéressant mais plus de place cette saison.');
});

it('lets the designated chief validate their own ministry application', function () {
    $chief = User::factory()->create();
    Role::findOrCreate(AccessControl::MINISTRY_CHIEF, 'web');
    $chief->givePermissionTo('validate_ministry_applications');
    $chief->assignRole(AccessControl::MINISTRY_CHIEF);

    $ministry = Ministry::factory()->create(['chef_id' => $chief->id]);
    $application = MinistryApplication::factory()->create(['ministry_id' => $ministry->id]);

    Sanctum::actingAs($chief);

    $this->postJson("/api/v1/admin/ministry-applications/{$application->id}/reject")
        ->assertOk()
        ->assertJsonPath('data.status', 'rejected');
});

it('forbids a chief from validating another ministry application', function () {
    $chief = User::factory()->create();
    Role::findOrCreate(AccessControl::MINISTRY_CHIEF, 'web');
    $chief->givePermissionTo('validate_ministry_applications');
    $chief->assignRole(AccessControl::MINISTRY_CHIEF);

    // A ministry led by someone else.
    $foreign = Ministry::factory()->create(['chef_id' => User::factory()->create()->id]);
    $application = MinistryApplication::factory()->create(['ministry_id' => $foreign->id]);

    Sanctum::actingAs($chief);

    $this->postJson("/api/v1/admin/ministry-applications/{$application->id}/approve")
        ->assertForbidden();

    expect($application->fresh()->status)->toBe(MinistryApplicationStatus::Pending);
});
