<?php

use App\Events\PrayerRequestReceived;
use App\Models\PrayerRequest;
use App\Models\Tenant;
use Illuminate\Support\Facades\Event;

// CHR-156: tenant-scoped private & presence channels. Authorization runs through
// `/broadcasting/auth` (inside the tenancy middleware since CHR-155), so it must
// resolve the Sanctum user on the tenant DB AND refuse a valid token trying to
// reach another church's channel.

// `/broadcasting/auth` signs responses with the broadcaster; the test env boots
// on the `null` driver (which can't sign), so point it at pusher — same protocol
// as Reverb, which is the real prod driver. Channel callbacks register on the
// boot-time driver, so re-load channels.php onto the pusher driver we just set.
beforeEach(function () {
    config([
        'broadcasting.default' => 'pusher',
        'broadcasting.connections.pusher.key' => 'testkey',
        'broadcasting.connections.pusher.secret' => 'testsecret',
        'broadcasting.connections.pusher.app_id' => 'testapp',
        'broadcasting.connections.pusher.options.cluster' => 'mt1',
    ]);

    require base_path('routes/channels.php');
});

it('broadcasts a new prayer request on the tenant private admin channel', function () {
    $tenant = Tenant::first();
    tenancy()->initialize($tenant);

    $channels = (new PrayerRequestReceived(new PrayerRequest(['name' => 'Koffi', 'category' => 'Santé', 'message' => 'x'])))
        ->broadcastOn();

    expect($channels[0]->name)->toBe('private-tenant.'.$tenant->getTenantKey().'.admin');
});

it('dispatches PrayerRequestReceived when a visitor submits a prayer', function () {
    Event::fake([PrayerRequestReceived::class]);

    $this->postJson('/api/v1/public/prayer-requests', [
        'phone' => '+2250700000000',
        'email' => 'a@b.co',
        'category' => 'Santé',
        'message' => 'Priez pour moi',
    ])->assertCreated();

    Event::assertDispatched(PrayerRequestReceived::class);
});

it('authorizes an admin on their own church private channel', function () {
    actingAsAdminWith([]);

    $this->postJson('/broadcasting/auth', [
        'channel_name' => 'private-tenant.'.Tenant::first()->getTenantKey().'.admin',
        'socket_id' => '1234.5678',
    ])->assertOk()->assertJsonStructure(['auth']);
});

it('refuses authorizing another church private channel with a valid token', function () {
    actingAsAdminWith([]);

    $this->postJson('/broadcasting/auth', [
        'channel_name' => 'private-tenant.some-other-church-key.admin',
        'socket_id' => '1234.5678',
    ])->assertForbidden();
});

it('authorizes a manage_live operator on the presence studio channel with roster info', function () {
    $user = actingAsAdminWith(['manage_live']);

    $response = $this->postJson('/broadcasting/auth', [
        'channel_name' => 'presence-tenant.'.Tenant::first()->getTenantKey().'.studio',
        'socket_id' => '1234.5678',
    ])->assertOk()->assertJsonStructure(['auth', 'channel_data']);

    expect($response->json('channel_data'))->toContain((string) $user->id, $user->name);
});

it('denies the presence studio channel to an admin without manage_live', function () {
    actingAsAdminWith([]);

    $this->postJson('/broadcasting/auth', [
        'channel_name' => 'presence-tenant.'.Tenant::first()->getTenantKey().'.studio',
        'socket_id' => '1234.5678',
    ])->assertForbidden();
});
