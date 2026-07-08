<?php

use App\Models\OfferingCollection;
use App\Models\Service;

it('records a multi-line offering collection for a service', function () {
    $admin = actingAsAdminWith(['view_finances']);
    $service = Service::factory()->create();

    $this->postJson("/api/v1/admin/services/{$service->id}/offering-collections", [
        'lines' => [
            ['nature' => 'dime', 'amount' => 55000],
            ['nature' => 'offrande', 'amount' => 32000],
        ],
    ])->assertOk()
        ->assertJsonCount(2, 'data');

    expect(OfferingCollection::where('service_id', $service->id)->sum('amount'))->toBe(87000);
    expect(OfferingCollection::where('service_id', $service->id)->where('nature', 'dime')->first()->counted_by_id)
        ->toBe($admin->id);
});

it('updates an existing line for the same service and nature instead of duplicating it', function () {
    actingAsAdminWith(['view_finances']);
    $service = Service::factory()->create();

    $this->postJson("/api/v1/admin/services/{$service->id}/offering-collections", [
        'lines' => [['nature' => 'dime', 'amount' => 10000]],
    ])->assertOk();

    $this->postJson("/api/v1/admin/services/{$service->id}/offering-collections", [
        'lines' => [['nature' => 'dime', 'amount' => 15000]],
    ])->assertOk();

    expect(OfferingCollection::where('service_id', $service->id)->count())->toBe(1);
    expect(OfferingCollection::where('service_id', $service->id)->first()->amount)->toBe(15000);
});

it('requires the view_finances permission to record a collection', function () {
    actingAsAdminWith(['view_services']);
    $service = Service::factory()->create();

    $this->postJson("/api/v1/admin/services/{$service->id}/offering-collections", [
        'lines' => [['nature' => 'dime', 'amount' => 10000]],
    ])->assertStatus(403);
});
