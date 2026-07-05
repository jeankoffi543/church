<?php

use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\Process;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\postJson;

function broadcastAdmin(): User
{
    $admin = User::factory()->create();
    $role = Role::findOrCreate('Régisseur diffusion', 'web');
    $role->givePermissionTo(Permission::findOrCreate('manage_live', 'web'));
    $admin->assignRole($role);

    return $admin;
}

/**
 * Start a broadcast and return `[stream, token]` parsed from the issued WHIP url.
 *
 * @return array{0: string, 1: string}
 */
function issueBroadcast(): array
{
    Setting::set('facebook_stream_key', 'FB-KEY-123', 'live');

    $whip = actingAs(broadcastAdmin(), 'sanctum')
        ->postJson('/api/v1/admin/studio/broadcast/facebook/start')
        ->assertOk()
        ->json('data.whip_url');

    parse_str((string) parse_url($whip, PHP_URL_QUERY), $query);

    return [(string) $query['stream'], (string) $query['token']];
}

it('issues a WHIP url with a stream + token for an authenticated régisseur', function () {
    Setting::set('facebook_stream_key', 'FB-KEY-123', 'live');

    $data = actingAs(broadcastAdmin(), 'sanctum')
        ->postJson('/api/v1/admin/studio/broadcast/facebook/start')
        ->assertOk()
        ->json('data');

    expect($data['stream'])->toStartWith('fb-')
        ->and($data['whip_url'])->toContain('stream='.$data['stream'])
        ->and($data['whip_url'])->toContain('token=')
        ->and($data['whep_url'])->toContain('/rtc/v1/play/')
        ->and($data['whep_url'])->toContain('stream='.$data['stream'])
        ->and($data['whep_url'])->not->toContain('token=');
});

it('forbids starting a broadcast without the manage_live permission', function () {
    Setting::set('facebook_stream_key', 'FB-KEY-123', 'live');

    actingAs(User::factory()->create(), 'sanctum')
        ->postJson('/api/v1/admin/studio/broadcast/facebook/start')
        ->assertForbidden();
});

it('rejects a broadcast when no Facebook stream key is configured', function () {
    actingAs(broadcastAdmin(), 'sanctum')
        ->postJson('/api/v1/admin/studio/broadcast/facebook/start')
        ->assertStatus(422);
});

it('authorizes a valid SRS publish and launches the Facebook relay', function () {
    Process::fake(['nohup *' => Process::result(output: '12345')]);

    [$stream, $token] = issueBroadcast();

    postJson('/api/v1/public/srs/on_publish', [
        'stream' => $stream,
        'param' => '?app=live&stream='.$stream.'&token='.$token,
    ])->assertOk()->assertSee('0');

    // Single relay to Facebook RTMPS (the site plays WHEP, no re-encode/HLS).
    Process::assertRan(fn ($process) => str_contains($process->command, 'ffmpeg')
        && str_contains($process->command, 'rtmps://')
        && str_contains($process->command, $stream));
});

it('rejects an SRS publish with a forged token', function () {
    [$stream] = issueBroadcast();

    postJson('/api/v1/public/srs/on_publish', [
        'stream' => $stream,
        'param' => '?app=live&stream='.$stream.'&token=forged',
    ])->assertForbidden();
});

it('kills the relay on SRS on_unpublish', function () {
    Process::fake([
        'nohup *' => Process::result(output: '12345'),
        'pkill*' => Process::result(),
    ]);

    [$stream, $token] = issueBroadcast();

    postJson('/api/v1/public/srs/on_publish', [
        'stream' => $stream,
        'param' => '?token='.$token,
    ])->assertOk();

    postJson('/api/v1/public/srs/on_unpublish', ['stream' => $stream])->assertOk();

    // Kills the Facebook ffmpeg, the HLS ffmpeg and its supervisor by stream name.
    Process::assertRan(fn ($process) => str_contains($process->command, 'pkill -f')
        && str_contains($process->command, $stream));
});
