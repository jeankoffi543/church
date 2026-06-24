<?php

use App\Http\Resources\V1\PastLiveResource;
use App\Models\Branch;
use App\Models\HomeGroup;
use App\Models\Ministry;
use App\Models\PastLive;
use App\Models\Sermon;
use App\Models\User;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

use function Pest\Laravel\actingAs;

/**
 * Guards the operator-aware admin filters wired through App\Support\QueryFilters,
 * since the package's own suffix parser resolves every operator to EQUAL.
 */
it('applies the contains (__lk) text operator', function () {
    Sermon::factory()->create(['title' => 'La grâce qui transforme']);
    Sermon::factory()->create(['title' => 'Le feu de Dieu']);

    $results = Sermon::query()->filter(['title__lk' => 'grâce'])->pluck('title');

    expect($results)->toHaveCount(1)
        ->and($results->first())->toBe('La grâce qui transforme');
});

it('applies starts_with (__sw) and ends_with (__ew) operators', function () {
    Sermon::factory()->create(['title' => 'Alpha et Oméga']);
    Sermon::factory()->create(['title' => 'Le chemin Alpha']);

    expect(Sermon::query()->filter(['title__sw' => 'Alpha'])->pluck('title'))
        ->toEqual(collect(['Alpha et Oméga']))
        ->and(Sermon::query()->filter(['title__ew' => 'Alpha'])->pluck('title'))
        ->toEqual(collect(['Le chemin Alpha']));
});

it('keeps the bare key as exact match while still supporting whereIn arrays', function () {
    Sermon::factory()->create(['title' => 'Exact']);
    Sermon::factory()->create(['title' => 'Other']);

    expect(Sermon::query()->filter(['title' => 'Exact'])->count())->toBe(1)
        ->and(Sermon::query()->filter(['title' => ['Exact', 'Other']])->count())->toBe(2);
});

it('sorts on a newly registered sortable column', function () {
    Sermon::factory()->create(['title' => 'B', 'is_published' => false]);
    Sermon::factory()->create(['title' => 'A', 'is_published' => true]);

    $order = Sermon::query()->sort(['is_published' => 'desc'])->pluck('is_published');

    expect($order->first())->toBeTrue();
});

it('filters users by their role relationship', function () {
    $role = Role::findOrCreate('Intercession', 'web');
    $member = User::factory()->create();
    $member->assignRole($role);
    User::factory()->create();

    $results = User::query()->filter(['role__eq' => 'Intercession'])->pluck('id');

    expect($results)->toHaveCount(1)->and($results->first())->toBe($member->id);
});

it('applies operator text filters on the secondary admin resources', function () {
    Ministry::factory()->create(['name' => 'Intercession de feu']);
    Ministry::factory()->create(['name' => 'Louange']);
    expect(Ministry::query()->filter(['name__lk' => 'feu'])->count())->toBe(1);

    HomeGroup::factory()->create(['address' => 'Quartier Riviera']);
    HomeGroup::factory()->create(['address' => 'Cocody Angré']);
    expect(HomeGroup::query()->filter(['address__sw' => 'Quartier'])->count())->toBe(1);

    Branch::factory()->create(['title' => 'Campus Yopougon']);
    Branch::factory()->create(['title' => 'Campus Abobo']);
    expect(Branch::query()->filter(['title__ew' => 'Abobo'])->count())->toBe(1);
});

it('filters home groups by day case-insensitively', function () {
    HomeGroup::factory()->create(['meeting_day' => 'Mardi', 'is_active' => true]);
    HomeGroup::factory()->create(['meeting_day' => 'Jeudi', 'is_active' => true]);

    expect(HomeGroup::query()->filter(['day' => 'mardi'])->count())->toBe(1)
        ->and(HomeGroup::query()->filter(['day' => 'MARDI'])->count())->toBe(1)
        ->and(HomeGroup::query()->filter(['day' => 'Mardi'])->count())->toBe(1)
        ->and(HomeGroup::query()->filter(['day' => 'Lundi'])->count())->toBe(0)
        // The admin QueryBuilder <select> emits `meeting_day__eq`.
        ->and(HomeGroup::query()->filter(['meeting_day__eq' => 'mardi'])->count())->toBe(1)
        ->and(HomeGroup::query()->filter(['meeting_day__eq' => 'Lundi'])->count())->toBe(0);
});

it('paginates admin lists when per_page arrives as a query string', function () {
    $admin = User::factory()->create();
    $role = Role::findOrCreate('Administrateur', 'web');
    $role->givePermissionTo(Permission::findOrCreate('view_cells', 'web'));
    $role->givePermissionTo(Permission::findOrCreate('manage_cells', 'web'));
    $admin->assignRole($role);

    HomeGroup::factory()->count(3)->create();

    // `per_page` is a string off the query string; the controller must coerce it
    // to an int before paginate()/forPage() (avoids "string * int" TypeError).
    actingAs($admin, 'sanctum')
        ->getJson('/api/v1/admin/home-groups?per_page=2')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.per_page', 2);
});

it('honours operator filters over the admin HTTP endpoint', function () {
    $admin = User::factory()->create(['is_active' => true]);
    $role = Role::findOrCreate('Administrateur', 'web');
    $role->givePermissionTo(Permission::findOrCreate('manage_sermons', 'web'));
    $admin->assignRole($role);

    Sermon::factory()->create(['title' => 'Combat spirituel', 'is_published' => true]);
    Sermon::factory()->create(['title' => 'Adoration', 'is_published' => true]);

    actingAs($admin, 'sanctum')
        ->getJson('/api/v1/admin/sermons?title__lk=Combat')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'Combat spirituel');
});

it('serialises a past live whose source_type is null without a 500', function () {
    // In production an invalid stored enum value makes the `VideoSourceType` cast
    // resolve to null; the resource must read it null-safely (`?->value`).
    $live = PastLive::factory()->create();
    $live->source_type = null;

    $payload = (new PastLiveResource($live))->toArray(request());

    expect($payload['source_type'])->toBeNull();
});
