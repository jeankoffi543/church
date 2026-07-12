<?php

use App\Models\CentralUser;
use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Laravel\Sanctum\Sanctum;

// CHR-160: Horizon is a PLATFORM tool — the `viewHorizon` gate must let ONLY
// central super-admins in (never a tenant user, never a guest).

it('denies Horizon to unauthenticated requests', function () {
    expect(Gate::allows('viewHorizon'))->toBeFalse();
});

it('denies Horizon to central staff who are not super-admins', function () {
    Sanctum::actingAs(CentralUser::factory()->support()->create(), ['platform'], 'central');

    expect(Gate::allows('viewHorizon'))->toBeFalse();
});

it('grants Horizon to a central super-admin', function () {
    Sanctum::actingAs(CentralUser::factory()->create(), ['platform'], 'central');

    expect(Gate::allows('viewHorizon'))->toBeTrue();
});

it('denies Horizon to a tenant user authenticated on the sanctum guard', function () {
    Sanctum::actingAs(User::factory()->create(), ['*'], 'sanctum');

    expect(Gate::allows('viewHorizon'))->toBeFalse();
});
