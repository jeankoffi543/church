<?php

use App\Broadcasting\TenantChannel;
use App\Enums\Feature;
use App\Enums\TenantStatus;
use App\Events\ChatMessageSent;
use App\Events\LiveStateChanged;
use App\Events\ReactionSent;
use App\Models\LiveChatMessage;
use App\Models\Tenant;
use Illuminate\Support\Facades\Route;
use Stancl\Tenancy\Middleware\InitializeTenancyByDomain;

// CHR-155: realtime is tenant-scoped. On a shared Reverb server, every live event
// must ride a `tenant.{key}.*` channel so one church's broadcast never reaches
// another church's listeners, and `/broadcasting/auth` must resolve the user on
// the tenant's own database.

/** Create a second, saved tenant without provisioning a real database. */
function makeTenant(string $name): Tenant
{
    $tenant = new Tenant;
    $tenant->name = $name;
    $tenant->status = TenantStatus::Active;
    $tenant->features = array_fill_keys(Feature::values(), true);
    $tenant->setInternal('create_database', false);
    $tenant->save();

    return $tenant;
}

it('broadcasts live events on the active tenant channel', function () {
    $tenant = Tenant::first();
    tenancy()->initialize($tenant);

    $channels = (new LiveStateChanged(true))->broadcastOn();

    expect($channels)->toHaveCount(1)
        ->and($channels[0]->name)->toBe('tenant.'.$tenant->getTenantKey().'.live');
});

it('isolates the channel name per tenant', function () {
    $first = Tenant::first();
    $second = makeTenant('Autre Église');

    tenancy()->initialize($first);
    $firstName = (new ReactionSent('flame', 1))->broadcastOn()[0]->name;

    tenancy()->initialize($second);
    $secondName = (new ReactionSent('flame', 1))->broadcastOn()[0]->name;

    expect($firstName)->not->toBe($secondName)
        ->and($firstName)->toContain($first->getTenantKey())
        ->and($secondName)->toContain($second->getTenantKey());
});

it('refuses to build a tenant channel outside a tenant context', function () {
    // No tenant is initialised in this test, so broadcasting would otherwise fall
    // back to a global channel shared by every church.
    expect(fn () => TenantChannel::prefix())
        ->toThrow(RuntimeException::class, 'outside a tenant context');

    $message = new LiveChatMessage(['author_name' => 'A', 'message' => 'hi', 'time_offset_seconds' => 0]);
    expect(fn () => (new ChatMessageSent($message))->broadcastOn())
        ->toThrow(RuntimeException::class);
});

it('exposes the tenant channel prefix over the public realtime endpoint', function () {
    $tenant = Tenant::first();

    $this->getJson('/api/v1/public/realtime')
        ->assertOk()
        ->assertJsonPath('data.channel_prefix', 'tenant.'.$tenant->getTenantKey().'.');
});

it('runs broadcasting auth inside the tenancy middleware so auth hits the tenant DB', function () {
    $route = collect(Route::getRoutes())->first(fn ($r) => $r->uri() === 'broadcasting/auth');

    expect($route)->not->toBeNull();

    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain(InitializeTenancyByDomain::class)
        ->and($middleware)->toContain('auth:sanctum');
});

it('rejects unauthenticated broadcasting auth requests', function () {
    $this->postJson('/broadcasting/auth', ['channel_name' => 'private-tenant.x.chat', 'socket_id' => '1.1'])
        ->assertUnauthorized();
});
