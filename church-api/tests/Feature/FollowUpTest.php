<?php

use App\Models\Convert;
use App\Models\FollowUp;
use App\Models\FollowUpNote;
use App\Models\Member;
use App\Models\User;

it('rejects an unauthenticated request', function () {
    $this->getJson('/api/v1/admin/follow-ups')->assertStatus(401);
});

it('creates a follow-up for a convert', function () {
    actingAsAdminWith(['manage_followups']);
    $convert = Convert::factory()->create(['name' => 'Aya Konan']);

    $this->postJson('/api/v1/admin/follow-ups', [
        'followable_type' => 'convert',
        'followable_id' => $convert->id,
    ])->assertCreated()
        ->assertJsonPath('data.followable_type', 'convert')
        ->assertJsonPath('data.followable_name', 'Aya Konan')
        ->assertJsonPath('data.status', 'nouveau');
});

it('creates a follow-up for a member', function () {
    actingAsAdminWith(['manage_followups']);
    $member = Member::factory()->create(['name' => 'Jean Koffi']);

    $this->postJson('/api/v1/admin/follow-ups', [
        'followable_type' => 'member',
        'followable_id' => $member->id,
    ])->assertCreated()
        ->assertJsonPath('data.followable_type', 'member')
        ->assertJsonPath('data.followable_name', 'Jean Koffi');
});

it('rejects a follow-up target that does not exist', function () {
    actingAsAdminWith(['manage_followups']);

    $this->postJson('/api/v1/admin/follow-ups', [
        'followable_type' => 'convert',
        'followable_id' => 999999,
    ])->assertStatus(422)->assertJsonValidationErrors(['followable_id']);
});

it('scopes the list to the assigned counselor unless the viewer is global', function () {
    $counselorA = actingAsAdminWith(['manage_followups']);
    $convert = Convert::factory()->create();

    $mine = FollowUp::factory()->forFollowable($convert)->create(['assigned_to' => $counselorA->id]);
    FollowUp::factory()->forFollowable(Convert::factory()->create())->create(['assigned_to' => User::factory()->create()->id]);

    $this->getJson('/api/v1/admin/follow-ups')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $mine->id);
});

it('lets a global viewer (Super Admin) see every case', function () {
    actingAsSuperAdmin();

    FollowUp::factory()->forFollowable(Convert::factory()->create())->count(3)->create();

    $this->getJson('/api/v1/admin/follow-ups')
        ->assertOk()
        ->assertJsonCount(3, 'data');
});

it('forbids a counselor from viewing a case not assigned to them', function () {
    $counselor = actingAsAdminWith(['manage_followups']);
    $other = User::factory()->create();
    $followUp = FollowUp::factory()->forFollowable(Convert::factory()->create())->create(['assigned_to' => $other->id]);

    expect($counselor->id)->not->toBe($other->id);

    $this->getJson("/api/v1/admin/follow-ups/{$followUp->id}")->assertStatus(403);
});

it('lets the assigned counselor add a timeline note', function () {
    $counselor = actingAsAdminWith(['manage_followups']);
    $followUp = FollowUp::factory()->forFollowable(Convert::factory()->create())->create(['assigned_to' => $counselor->id]);

    $this->postJson("/api/v1/admin/follow-ups/{$followUp->id}/notes", [
        'action_type' => 'appel',
        'note' => 'Premier contact téléphonique, très réceptif.',
    ])->assertCreated()
        ->assertJsonPath('data.action_type', 'appel')
        ->assertJsonPath('data.author_name', $counselor->name);

    $this->getJson("/api/v1/admin/follow-ups/{$followUp->id}")
        ->assertOk()
        ->assertJsonCount(1, 'data.notes');
});

it('forbids a counselor from adding a note to someone else\'s case', function () {
    actingAsAdminWith(['manage_followups']);
    $other = User::factory()->create();
    $followUp = FollowUp::factory()->forFollowable(Convert::factory()->create())->create(['assigned_to' => $other->id]);

    $this->postJson("/api/v1/admin/follow-ups/{$followUp->id}/notes", [
        'note' => 'Tentative non autorisée.',
    ])->assertStatus(403);
});

it('updates the status and reassigns a case', function () {
    actingAsSuperAdmin();
    $counselor = User::factory()->create();
    $followUp = FollowUp::factory()->forFollowable(Convert::factory()->create())->create();

    $this->putJson("/api/v1/admin/follow-ups/{$followUp->id}", [
        'status' => 'contacte',
        'assigned_to' => $counselor->id,
    ])->assertOk()
        ->assertJsonPath('data.status', 'contacte')
        ->assertJsonPath('data.counselor_name', $counselor->name);
});

it('cascades note deletion when the follow-up is deleted', function () {
    actingAsSuperAdmin();
    $followUp = FollowUp::factory()->forFollowable(Convert::factory()->create())->create();
    $note = $followUp->notes()->create(['note' => 'Une note.', 'action_type' => 'appel']);

    $this->deleteJson("/api/v1/admin/follow-ups/{$followUp->id}")->assertStatus(204);

    expect(FollowUpNote::find($note->id))->toBeNull();
});
