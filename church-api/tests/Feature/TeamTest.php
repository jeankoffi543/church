<?php

use App\Models\Member;
use App\Models\Team;

it('rejects an unauthenticated request', function () {
    $this->getJson('/api/v1/admin/teams')->assertStatus(401);
});

it('creates a team and syncs its members', function () {
    actingAsAdminWith(['manage_teams']);
    $members = Member::factory()->count(2)->create();

    $response = $this->postJson('/api/v1/admin/teams', [
        'name' => 'Louange & Adoration',
        'member_ids' => $members->pluck('id')->all(),
    ])->assertCreated()
        ->assertJsonPath('data.name', 'Louange & Adoration')
        ->assertJsonPath('data.members_count', 2);

    $id = $response->json('data.id');

    expect(Team::find($id)->members()->pluck('members.id')->sort()->values()->all())
        ->toBe($members->pluck('id')->sort()->values()->all());
});

it('updates a team and re-syncs its members', function () {
    actingAsAdminWith(['manage_teams']);
    $team = Team::factory()->create();
    $original = Member::factory()->create();
    $team->members()->attach($original);

    $replacement = Member::factory()->create();

    $this->putJson("/api/v1/admin/teams/{$team->id}", [
        'member_ids' => [$replacement->id],
    ])->assertOk()->assertJsonPath('data.members_count', 1);

    expect($team->members()->pluck('members.id')->all())->toBe([$replacement->id]);
});

it('deletes a team without being blocked by its assignments', function () {
    actingAsAdminWith(['manage_teams']);
    $team = Team::factory()->create();

    $this->deleteJson("/api/v1/admin/teams/{$team->id}")->assertStatus(204);
    expect(Team::find($team->id))->toBeNull();
});

it('rejects creation without the manage_teams permission', function () {
    actingAsAdminWith(['view_teams']);

    $this->postJson('/api/v1/admin/teams', ['name' => 'Protocole'])->assertStatus(403);
});
