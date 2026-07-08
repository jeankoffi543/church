<?php

use App\Models\Resource;
use App\Models\ResourceBooking;

it('rejects an unauthenticated request', function () {
    $this->getJson('/api/v1/admin/resources')->assertStatus(401);
});

it('creates, updates and deletes a resource', function () {
    actingAsAdminWith(['manage_resources']);

    $response = $this->postJson('/api/v1/admin/resources', [
        'name' => 'Bus 30 places',
        'type' => 'vehicule',
        'location' => 'Garage principal',
    ])->assertCreated()->assertJsonPath('data.name', 'Bus 30 places');

    $id = $response->json('data.id');

    $this->putJson("/api/v1/admin/resources/{$id}", ['condition' => 'moyen'])
        ->assertOk()
        ->assertJsonPath('data.condition', 'moyen');

    $this->deleteJson("/api/v1/admin/resources/{$id}")->assertStatus(204);
    expect(Resource::find($id))->toBeNull();
});

it('rejects creation without the manage_resources permission', function () {
    actingAsAdminWith(['view_resources']);

    $this->postJson('/api/v1/admin/resources', ['name' => 'Bus', 'type' => 'vehicule'])
        ->assertStatus(403);
});

it('refuses to delete a resource that already has bookings', function () {
    actingAsAdminWith(['manage_resources']);
    $resource = Resource::factory()->create();
    ResourceBooking::factory()->create(['resource_id' => $resource->id]);

    $this->deleteJson("/api/v1/admin/resources/{$resource->id}")->assertStatus(422);
    expect(Resource::find($resource->id))->not->toBeNull();
});
