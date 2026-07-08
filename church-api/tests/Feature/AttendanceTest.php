<?php

use App\Models\Attendance;
use App\Models\Service;

it('records a multi-category attendance count for a service', function () {
    $admin = actingAsAdminWith(['manage_attendance']);
    $service = Service::factory()->create();

    $this->postJson("/api/v1/admin/services/{$service->id}/attendances", [
        'lines' => [
            ['category' => 'hommes', 'count' => 80],
            ['category' => 'femmes', 'count' => 120],
        ],
    ])->assertOk()
        ->assertJsonCount(2, 'data');

    expect(Attendance::where('service_id', $service->id)->sum('count'))->toBe(200);
    expect(Attendance::where('service_id', $service->id)->where('category', 'hommes')->first()->recorded_by_id)
        ->toBe($admin->id);
});

it('updates an existing category for the same service instead of duplicating it', function () {
    actingAsAdminWith(['manage_attendance']);
    $service = Service::factory()->create();

    $this->postJson("/api/v1/admin/services/{$service->id}/attendances", [
        'lines' => [['category' => 'enfants', 'count' => 30]],
    ])->assertOk();

    $this->postJson("/api/v1/admin/services/{$service->id}/attendances", [
        'lines' => [['category' => 'enfants', 'count' => 45]],
    ])->assertOk();

    expect(Attendance::where('service_id', $service->id)->count())->toBe(1);
    expect(Attendance::where('service_id', $service->id)->first()->count)->toBe(45);
});

it('requires the manage_attendance permission to record attendance', function () {
    actingAsAdminWith(['view_services']);
    $service = Service::factory()->create();

    $this->postJson("/api/v1/admin/services/{$service->id}/attendances", [
        'lines' => [['category' => 'hommes', 'count' => 10]],
    ])->assertStatus(403);
});

it('refuses to delete a service that already has attendance recorded', function () {
    actingAsAdminWith(['manage_services', 'manage_attendance']);

    $service = Service::factory()->create();
    $this->postJson("/api/v1/admin/services/{$service->id}/attendances", [
        'lines' => [['category' => 'hommes', 'count' => 10]],
    ])->assertOk();

    $this->deleteJson("/api/v1/admin/services/{$service->id}")->assertStatus(422);

    expect(Service::find($service->id))->not->toBeNull();
});

it('includes the attendance breakdown when listing services', function () {
    actingAsAdminWith(['view_services', 'manage_attendance']);
    $service = Service::factory()->create();

    $this->postJson("/api/v1/admin/services/{$service->id}/attendances", [
        'lines' => [
            ['category' => 'hommes', 'count' => 10],
            ['category' => 'visiteurs', 'count' => 5],
        ],
    ])->assertOk();

    $this->getJson('/api/v1/admin/services')
        ->assertOk()
        ->assertJsonCount(2, 'data.0.attendances');
});
