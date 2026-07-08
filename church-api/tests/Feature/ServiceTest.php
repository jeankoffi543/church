<?php

use App\Models\Service;

it('rejects an unauthenticated request', function () {
    $this->getJson('/api/v1/admin/services')->assertStatus(401);
});

it('lists services newest first', function () {
    actingAsAdminWith(['view_services']);

    Service::factory()->create(['type' => 'culte_dominical', 'date' => '2026-06-01']);
    Service::factory()->create(['type' => 'veillee', 'date' => '2026-07-01']);

    $this->getJson('/api/v1/admin/services')
        ->assertOk()
        ->assertJsonPath('data.0.type', 'veillee');
});

it('creates a service', function () {
    actingAsAdminWith(['manage_services']);

    $this->postJson('/api/v1/admin/services', [
        'type' => 'culte_dominical',
        'date' => '2026-07-05',
        'start_time' => '09:00',
    ])->assertCreated()
        ->assertJsonPath('data.type', 'culte_dominical')
        ->assertJsonPath('data.date', '2026-07-05');
});

it('rejects creation without the manage_services permission', function () {
    actingAsAdminWith(['view_services']);

    $this->postJson('/api/v1/admin/services', [
        'type' => 'culte_dominical',
        'date' => '2026-07-05',
    ])->assertStatus(403);
});

it('refuses to delete a service that already has offering collections', function () {
    actingAsAdminWith(['manage_services', 'view_finances']);

    $service = Service::factory()->create();
    $this->postJson("/api/v1/admin/services/{$service->id}/offering-collections", [
        'lines' => [['nature' => 'dime', 'amount' => 20000]],
    ])->assertOk();

    $this->deleteJson("/api/v1/admin/services/{$service->id}")->assertStatus(422);

    expect(Service::find($service->id))->not->toBeNull();
});
