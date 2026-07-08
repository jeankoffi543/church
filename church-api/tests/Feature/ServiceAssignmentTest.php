<?php

use App\Models\Member;
use App\Models\Service;
use App\Models\ServiceAssignment;
use App\Models\Team;

it('rejects an unauthenticated request', function () {
    $service = Service::factory()->create();
    $this->postJson("/api/v1/admin/services/{$service->id}/assignments", ['lines' => []])
        ->assertStatus(401);
});

it('rejects the roster upsert without the manage_teams permission', function () {
    actingAsAdminWith(['view_teams']);
    $service = Service::factory()->create();

    $this->postJson("/api/v1/admin/services/{$service->id}/assignments", ['lines' => []])
        ->assertStatus(403);
});

it('creates roster lines for a service', function () {
    actingAsAdminWith(['manage_teams']);
    $service = Service::factory()->create();
    $team = Team::factory()->create();
    $members = Member::factory()->count(2)->create();

    $this->postJson("/api/v1/admin/services/{$service->id}/assignments", [
        'lines' => [
            ['member_id' => $members[0]->id, 'team_id' => $team->id, 'role' => 'Chantre'],
            ['member_id' => $members[1]->id, 'role' => 'Huissier', 'status' => 'confirme'],
        ],
    ])->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.role', 'Chantre')
        ->assertJsonPath('data.0.team_name', $team->name)
        ->assertJsonPath('data.1.status', 'confirme');

    expect(ServiceAssignment::where('service_id', $service->id)->count())->toBe(2);
});

it('updates an existing line instead of duplicating it when resubmitted', function () {
    actingAsAdminWith(['manage_teams']);
    $service = Service::factory()->create();
    $member = Member::factory()->create();

    ServiceAssignment::factory()->create([
        'service_id' => $service->id,
        'member_id' => $member->id,
        'role' => 'Chantre',
        'status' => 'prevu',
    ]);

    $this->postJson("/api/v1/admin/services/{$service->id}/assignments", [
        'lines' => [
            ['member_id' => $member->id, 'role' => 'Chef de choeur', 'status' => 'confirme'],
        ],
    ])->assertOk()->assertJsonCount(1, 'data');

    expect(ServiceAssignment::where('service_id', $service->id)->count())->toBe(1);
    $assignment = ServiceAssignment::where('service_id', $service->id)->first();
    expect($assignment->role)->toBe('Chef de choeur');
    expect($assignment->status)->toBe('confirme');
});

it('drops a line omitted from the resubmitted roster', function () {
    actingAsAdminWith(['manage_teams']);
    $service = Service::factory()->create();
    $kept = Member::factory()->create();
    $dropped = Member::factory()->create();

    ServiceAssignment::factory()->create(['service_id' => $service->id, 'member_id' => $kept->id]);
    ServiceAssignment::factory()->create(['service_id' => $service->id, 'member_id' => $dropped->id]);

    $this->postJson("/api/v1/admin/services/{$service->id}/assignments", [
        'lines' => [
            ['member_id' => $kept->id, 'role' => 'Chantre'],
        ],
    ])->assertOk()->assertJsonCount(1, 'data');

    expect(ServiceAssignment::where('member_id', $kept->id)->exists())->toBeTrue();
    expect(ServiceAssignment::where('member_id', $dropped->id)->exists())->toBeFalse();
});

it('clears the whole roster when submitted with an empty lines array', function () {
    actingAsAdminWith(['manage_teams']);
    $service = Service::factory()->create();
    ServiceAssignment::factory()->count(2)->create(['service_id' => $service->id]);

    $this->postJson("/api/v1/admin/services/{$service->id}/assignments", ['lines' => []])
        ->assertOk()
        ->assertJsonCount(0, 'data');

    expect(ServiceAssignment::where('service_id', $service->id)->count())->toBe(0);
});
