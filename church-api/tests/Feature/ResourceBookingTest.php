<?php

use App\Models\Resource;
use App\Models\ResourceBooking;

it('creates a booking for a resource', function () {
    $admin = actingAsAdminWith(['manage_resources']);
    $resource = Resource::factory()->create();

    $this->postJson('/api/v1/admin/resource-bookings', [
        'resource_id' => $resource->id,
        'title' => 'Culte spécial Pâques',
        'starts_at' => '2026-08-01 08:00:00',
        'ends_at' => '2026-08-01 12:00:00',
    ])->assertCreated()
        ->assertJsonPath('data.title', 'Culte spécial Pâques')
        ->assertJsonPath('data.resource_name', $resource->name)
        ->assertJsonPath('data.booked_by_name', $admin->name);
});

it('rejects an overlapping booking on the same resource', function () {
    actingAsAdminWith(['manage_resources']);
    $resource = Resource::factory()->create();

    ResourceBooking::factory()->create([
        'resource_id' => $resource->id,
        'starts_at' => '2026-08-01 08:00:00',
        'ends_at' => '2026-08-01 12:00:00',
    ]);

    $this->postJson('/api/v1/admin/resource-bookings', [
        'resource_id' => $resource->id,
        'title' => 'Réunion concurrente',
        'starts_at' => '2026-08-01 10:00:00', // overlaps 08:00–12:00
        'ends_at' => '2026-08-01 14:00:00',
    ])->assertStatus(422)->assertJsonValidationErrors(['starts_at']);
});

it('rejects an overlapping booking submitted in datetime-local format', function () {
    // The frontend <input type="datetime-local"> sends "Y-m-d\TH:i" (T
    // separator, no seconds) — distinct from the "Y-m-d H:i:s" the DB
    // stores. The overlap check must normalize both sides before comparing,
    // or the raw string comparison silently misses real overlaps.
    actingAsAdminWith(['manage_resources']);
    $resource = Resource::factory()->create();

    ResourceBooking::factory()->create([
        'resource_id' => $resource->id,
        'starts_at' => '2026-08-10 18:00:00',
        'ends_at' => '2026-08-10 20:00:00',
    ]);

    $this->postJson('/api/v1/admin/resource-bookings', [
        'resource_id' => $resource->id,
        'title' => 'Chevauchement datetime-local',
        'starts_at' => '2026-08-10T19:00',
        'ends_at' => '2026-08-10T21:00',
    ])->assertStatus(422)->assertJsonValidationErrors(['starts_at']);
});

it('allows a back-to-back booking that does not actually overlap', function () {
    actingAsAdminWith(['manage_resources']);
    $resource = Resource::factory()->create();

    ResourceBooking::factory()->create([
        'resource_id' => $resource->id,
        'starts_at' => '2026-08-01 08:00:00',
        'ends_at' => '2026-08-01 12:00:00',
    ]);

    $this->postJson('/api/v1/admin/resource-bookings', [
        'resource_id' => $resource->id,
        'title' => 'Réunion suivante',
        'starts_at' => '2026-08-01 12:00:00', // starts exactly when the other ends
        'ends_at' => '2026-08-01 14:00:00',
    ])->assertCreated();
});

it('ignores a cancelled booking when checking for overlap', function () {
    actingAsAdminWith(['manage_resources']);
    $resource = Resource::factory()->create();

    ResourceBooking::factory()->create([
        'resource_id' => $resource->id,
        'starts_at' => '2026-08-01 08:00:00',
        'ends_at' => '2026-08-01 12:00:00',
        'status' => 'annule',
    ]);

    $this->postJson('/api/v1/admin/resource-bookings', [
        'resource_id' => $resource->id,
        'title' => 'Réunion sur créneau libéré',
        'starts_at' => '2026-08-01 09:00:00',
        'ends_at' => '2026-08-01 11:00:00',
    ])->assertCreated();
});

it('allows updating a booking to move it to a free slot, and rejects a conflicting move', function () {
    actingAsAdminWith(['manage_resources']);
    $resource = Resource::factory()->create();

    $booking = ResourceBooking::factory()->create([
        'resource_id' => $resource->id,
        'starts_at' => '2026-08-01 08:00:00',
        'ends_at' => '2026-08-01 10:00:00',
    ]);
    $other = ResourceBooking::factory()->create([
        'resource_id' => $resource->id,
        'starts_at' => '2026-08-01 14:00:00',
        'ends_at' => '2026-08-01 16:00:00',
    ]);

    // Free move: no conflict.
    $this->putJson("/api/v1/admin/resource-bookings/{$booking->id}", [
        'starts_at' => '2026-08-01 09:00:00',
        'ends_at' => '2026-08-01 11:00:00',
    ])->assertOk();

    // Conflicting move: overlaps $other.
    $this->putJson("/api/v1/admin/resource-bookings/{$booking->id}", [
        'starts_at' => '2026-08-01 15:00:00',
        'ends_at' => '2026-08-01 17:00:00',
    ])->assertStatus(422);
});

it('deletes a booking', function () {
    actingAsAdminWith(['manage_resources']);
    $booking = ResourceBooking::factory()->create();

    $this->deleteJson("/api/v1/admin/resource-bookings/{$booking->id}")->assertStatus(204);
    expect(ResourceBooking::find($booking->id))->toBeNull();
});
