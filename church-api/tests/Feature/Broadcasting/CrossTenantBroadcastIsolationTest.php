<?php

use App\Enums\Feature;
use App\Enums\TenantStatus;
use App\Events\AudienceUpdated;
use App\Events\ChatMessageSent;
use App\Events\LiveSourceChanged;
use App\Events\LiveStateChanged;
use App\Events\PrayerRequestReceived;
use App\Events\ReactionSent;
use App\Events\ScriptureStreamEvent;
use App\Models\LiveChatMessage;
use App\Models\PrayerRequest;
use App\Models\Tenant;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;

// CHR-158: the automated cross-tenant isolation guard. Every realtime event must
// ride a channel scoped to the active tenant (`tenant.{key}.*`) so that, on the
// single shared Reverb server, no church can ever receive another church's
// broadcasts. If a new broadcast event ships on a global channel, this fails.

/** One fresh instance of every broadcast event the app emits. */
function allBroadcastEvents(): array
{
    return [
        'ReactionSent' => new ReactionSent('flame', 1),
        'AudienceUpdated' => new AudienceUpdated(3),
        'LiveStateChanged' => new LiveStateChanged(true, now()->toIso8601String()),
        'LiveSourceChanged' => new LiveSourceChanged('https://example.test/live.m3u8', 'Titre'),
        'ChatMessageSent' => new ChatMessageSent(new LiveChatMessage(['author_name' => 'A', 'message' => 'hi', 'time_offset_seconds' => 0])),
        'ScriptureStreamEvent' => new ScriptureStreamEvent('show', ['reference' => 'Jean 3:16']),
        'PrayerRequestReceived' => new PrayerRequestReceived(new PrayerRequest(['name' => 'Koffi', 'category' => 'Santé', 'message' => 'x'])),
    ];
}

/** A second saved, active tenant without provisioning a real database. */
function makeIsolationTenant(string $name): Tenant
{
    $tenant = new Tenant;
    $tenant->name = $name;
    $tenant->status = TenantStatus::Active;
    $tenant->features = array_fill_keys(Feature::values(), true);
    $tenant->setInternal('create_database', false);
    $tenant->save();

    return $tenant;
}

it('keeps the isolation checks in sync with every broadcast event', function () {
    $discovered = collect(glob(app_path('Events/*.php')))
        ->map(fn (string $file): string => 'App\\Events\\'.basename($file, '.php'))
        ->filter(fn (string $class): bool => is_subclass_of($class, ShouldBroadcast::class))
        ->map(fn (string $class): string => class_basename($class))
        ->values()
        ->all();

    // A new broadcast event must be added to allBroadcastEvents() — which forces
    // whoever adds it to run it through the isolation assertions below.
    expect(array_keys(allBroadcastEvents()))->toEqualCanonicalizing($discovered);
});

it('broadcasts every event only on channels scoped to the active tenant', function () {
    $tenant = Tenant::first();
    tenancy()->initialize($tenant);
    $key = $tenant->getTenantKey();

    foreach (allBroadcastEvents() as $event) {
        $channels = $event->broadcastOn();

        expect($channels)->not->toBeEmpty();

        foreach ($channels as $channel) {
            expect($channel->name)->toContain("tenant.{$key}.");
        }
    }
});

it('never shares a broadcast channel between two churches', function () {
    $a = Tenant::first();
    $b = makeIsolationTenant('Autre Église');

    foreach (allBroadcastEvents() as $event) {
        tenancy()->initialize($a);
        $aNames = array_map(fn ($c) => $c->name, $event->broadcastOn());

        tenancy()->initialize($b);
        $bNames = array_map(fn ($c) => $c->name, $event->broadcastOn());

        expect(array_intersect($aNames, $bNames))->toBeEmpty();

        foreach ($aNames as $name) {
            expect($name)->toContain($a->getTenantKey())
                ->and($name)->not->toContain($b->getTenantKey());
        }
    }
});
