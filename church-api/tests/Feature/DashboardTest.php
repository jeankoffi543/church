<?php

use App\Models\Attendance;
use App\Models\Convert;
use App\Models\Donation;
use App\Models\FollowUp;
use App\Models\Member;
use App\Models\OfferingCollection;
use App\Models\Resource;
use App\Models\ResourceBooking;
use App\Models\Service;
use App\Models\ServiceAssignment;
use App\Models\User;
use App\Support\AccessControl;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

it('rejects an unauthenticated request', function () {
    $this->getJson('/api/v1/admin/dashboard/summary')->assertStatus(401);
});

it('rejects a request without view_dashboard', function () {
    actingAsAdminWith(['manage_members']);
    $this->getJson('/api/v1/admin/dashboard/summary')->assertStatus(403);
});

it('omits a section the caller cannot access, instead of zeroing it', function () {
    actingAsAdminWith(['view_dashboard']);

    $response = $this->getJson('/api/v1/admin/dashboard/summary')->assertOk();

    $response->assertJsonMissingPath('data.members');
    $response->assertJsonMissingPath('data.giving');
});

it('includes members counts scoped to the requested period', function () {
    actingAsAdminWith(['view_dashboard', 'view_members']);

    Member::factory()->create(['status' => 'actif', 'created_at' => now()]);
    Member::factory()->create(['status' => 'inactif', 'created_at' => now()]);
    Member::factory()->create(['status' => 'actif', 'created_at' => now()->subYear()]);

    $from = now()->startOfMonth()->toDateString();
    $to = now()->toDateString();

    $this->getJson("/api/v1/admin/dashboard/summary?from={$from}&to={$to}")
        ->assertOk()
        ->assertJsonPath('data.members.total', 3)
        ->assertJsonPath('data.members.active', 2)
        ->assertJsonPath('data.members.new_in_period', 2);
});

it('computes services and attendance totals within the period', function () {
    actingAsAdminWith(['view_dashboard', 'view_services', 'view_attendance']);

    $inPeriod = Service::factory()->create(['date' => now()->startOfMonth()->addDays(2)]);
    Attendance::factory()->create(['service_id' => $inPeriod->id, 'category' => 'hommes', 'count' => 10]);
    Attendance::factory()->create(['service_id' => $inPeriod->id, 'category' => 'femmes', 'count' => 15]);
    Service::factory()->create(['date' => now()->subYear()]);

    $from = now()->startOfMonth()->toDateString();
    $to = now()->toDateString();

    $this->getJson("/api/v1/admin/dashboard/summary?from={$from}&to={$to}")
        ->assertOk()
        ->assertJsonPath('data.services.count_in_period', 1)
        ->assertJsonPath('data.services.attendance_in_period', 25);
});

it('merges online and in-person giving into one combined total', function () {
    actingAsAdminWith(['view_dashboard', 'view_finances']);

    Donation::factory()->create(['status' => 'success', 'purpose_key' => 'dime', 'amount' => 5000, 'created_at' => now()]);
    $service = Service::factory()->create(['date' => now()]);
    OfferingCollection::factory()->create(['service_id' => $service->id, 'nature' => 'dime', 'amount' => 3000]);

    $from = now()->startOfMonth()->toDateString();
    $to = now()->toDateString();

    $this->getJson("/api/v1/admin/dashboard/summary?from={$from}&to={$to}")
        ->assertOk()
        ->assertJsonPath('data.giving.total', 8000)
        ->assertJsonPath('data.giving.en_ligne', 5000)
        ->assertJsonPath('data.giving.especes', 3000);
});

it('scopes open follow-ups to the assigned counselor for a non-global viewer', function () {
    $counselor = actingAsAdminWith(['view_dashboard', 'view_followups']);

    FollowUp::factory()->forFollowable(Convert::factory()->create())
        ->create(['assigned_to' => $counselor->id, 'status' => 'nouveau']);
    FollowUp::factory()->forFollowable(Convert::factory()->create())
        ->create(['assigned_to' => User::factory()->create()->id, 'status' => 'nouveau']);
    FollowUp::factory()->forFollowable(Convert::factory()->create())
        ->create(['assigned_to' => $counselor->id, 'status' => 'integre']);

    $this->getJson('/api/v1/admin/dashboard/summary')
        ->assertOk()
        ->assertJsonPath('data.followups.open_count', 1);
});

it('sees every open follow-up as a Pasteur', function () {
    $pastor = User::factory()->create();
    Role::findOrCreate(AccessControl::PASTEUR, 'web');
    Permission::findOrCreate('view_dashboard', 'web');
    Permission::findOrCreate('view_followups', 'web');
    $pastor->givePermissionTo(['view_dashboard', 'view_followups']);
    $pastor->assignRole(AccessControl::PASTEUR);
    Sanctum::actingAs($pastor);

    FollowUp::factory()->forFollowable(Convert::factory()->create())
        ->create(['assigned_to' => User::factory()->create()->id, 'status' => 'nouveau']);
    FollowUp::factory()->forFollowable(Convert::factory()->create())
        ->create(['assigned_to' => User::factory()->create()->id, 'status' => 'contacte']);

    $this->getJson('/api/v1/admin/dashboard/summary')
        ->assertOk()
        ->assertJsonPath('data.followups.open_count', 2);
});

it('reports resource booking and team planning coverage', function () {
    actingAsAdminWith(['view_dashboard', 'view_resources', 'view_teams']);

    $resource = Resource::factory()->create();
    ResourceBooking::factory()->create(['resource_id' => $resource->id, 'starts_at' => now()->addDay(), 'ends_at' => now()->addDay()->addHour()]);
    ResourceBooking::factory()->create(['resource_id' => $resource->id, 'starts_at' => now()->subDay(), 'ends_at' => now()->subDay()->addHour()]);

    $planned = Service::factory()->create(['date' => now()]);
    $unplanned = Service::factory()->create(['date' => now()]);
    ServiceAssignment::factory()->create(['service_id' => $planned->id, 'member_id' => Member::factory()->create()->id]);

    $from = now()->startOfMonth()->toDateString();
    $to = now()->endOfMonth()->toDateString();

    $this->getJson("/api/v1/admin/dashboard/summary?from={$from}&to={$to}")
        ->assertOk()
        ->assertJsonPath('data.resources.upcoming_bookings', 1)
        ->assertJsonPath('data.teams.services_total', 2)
        ->assertJsonPath('data.teams.services_planned', 1);
});
